import axios, { AxiosInstance } from 'axios';
import {
  CREDENTIAL_STATUS_CONFIG_FILE,
  CREDENTIAL_STATUS_LOG_FILE,
  CREDENTIAL_STATUS_REPO_BRANCH_NAME,
  BaseCredentialStatusClient,
  VisibilityLevel,
  decodeSystemData,
} from './credential-status';

const CREDENTIAL_STATUS_CONFIG_PATH_ENCODED = encodeURIComponent(CREDENTIAL_STATUS_CONFIG_FILE);
const CREDENTIAL_STATUS_LOG_PATH_ENCODED = encodeURIComponent(CREDENTIAL_STATUS_LOG_FILE);

const CREDENTIAL_STATUS_WEBSITE_HOME_PAGE_PATH = 'index.html';
const CREDENTIAL_STATUS_WEBSITE_HOME_PAGE =
`<html>
  <head>
    <title>Credential Status Management Service</title>
  </head>
  <body>
    <h1>We manage credential status for an instance of the <a href="https://w3c-ccg.github.io/vc-api">VC-API</a></h1>
  </body>
</html>`;

const CREDENTIAL_STATUS_WEBSITE_CI_CONFIG_PATH = '.gitlab-ci.yml';
const CREDENTIAL_STATUS_WEBSITE_CI_CONFIG =
`image: ruby:2.7

pages:
  script:
    - gem install bundler
    - bundle install
    - bundle exec jekyll build -d public
  artifacts:
    paths:
      - public`;

const CREDENTIAL_STATUS_WEBSITE_GEMFILE_PATH = 'Gemfile';
const CREDENTIAL_STATUS_WEBSITE_GEMFILE =
`source "https://rubygems.org"

gem "jekyll"`;

// Type definition for GitlabCredentialStatusClient constructor method
type GitlabCredentialStatusClientParameters = {
  credStatusRepoName: string;
  credStatusRepoOrgName: string;
  credStatusRepoOrgId: string;
  credStatusRepoVisibility: VisibilityLevel;
  credStatusClientAccessToken: string;
};

// Implementation of BaseCredentialStatusClient for GitLab
export class GitlabCredentialStatusClient extends BaseCredentialStatusClient {
  private credStatusRepoName: string;
  private credStatusRepoId: string;
  private credStatusRepoOrgName: string;
  private credStatusRepoOrgId: string;
  private credStatusRepoVisibility: VisibilityLevel;
  private client: AxiosInstance;

  constructor(config: GitlabCredentialStatusClientParameters) {
    super();
    this.credStatusRepoName = config.credStatusRepoName;
    this.credStatusRepoId = ''; // This value is set in createStatusRepo
    this.credStatusRepoOrgName = config.credStatusRepoOrgName;
    this.credStatusRepoOrgId = config.credStatusRepoOrgId;
    this.credStatusRepoVisibility = config.credStatusRepoVisibility;
    this.client = axios.create({
      baseURL: 'https://gitlab.com/api/v4',
      timeout: 6000,
      headers: {
        'Authorization': `Bearer ${config.credStatusClientAccessToken}`
      }
    });
  }

  // Retrieve endpoint for repos in org
  reposInOrgEndpoint(): string {
    return `/groups/${this.credStatusRepoOrgId}/projects`;
  }

  // Retrieve endpoint for repos
  reposEndpoint(): string {
    return '/projects';
  }

  // Retrieve endpoint for files
  filesEndpoint(path: string): string {
    return `/projects/${this.credStatusRepoId}/repository/files/${path}`;
  }

  // Retrieve endpoint for commits
  commitsEndpoint(): string {
    return `/projects/${this.credStatusRepoId}/repository/commits`;
  }

  // Get credential status url
  getCredentialStatusUrl(): string {
    return `https://${this.credStatusRepoOrgName}.gitlab.io/${this.credStatusRepoName}`;
  }

  // Setup website to host credential status management resources
  async setupCredentialStatusWebsite(): Promise<void> {
    const timestamp = (new Date()).toISOString();
    const message = `[${timestamp}]: setup status website`;
    const websiteRequestConfig = {
      branch: CREDENTIAL_STATUS_REPO_BRANCH_NAME,
      commit_message: message,
      actions: [
        {
          action: 'create',
          file_path: CREDENTIAL_STATUS_WEBSITE_HOME_PAGE_PATH,
          content: CREDENTIAL_STATUS_WEBSITE_HOME_PAGE
        },
        {
          action: 'create',
          file_path: CREDENTIAL_STATUS_WEBSITE_CI_CONFIG_PATH,
          content: CREDENTIAL_STATUS_WEBSITE_CI_CONFIG
        },
        {
          action: 'create',
          file_path: CREDENTIAL_STATUS_WEBSITE_GEMFILE_PATH,
          content: CREDENTIAL_STATUS_WEBSITE_GEMFILE
        }
      ]
    };
    await this.client.post(this.commitsEndpoint(), websiteRequestConfig);
  }

  // Retrieve list of repos in org
  async getReposInOrg(): Promise<any[]> {
    const repoRequestConfig = {
      params: {
        owned: true,
        simple: true
      }
    };
    const repos = await this.client.get(this.reposInOrgEndpoint(), repoRequestConfig);
    return repos.data as any[];
  }

  // Check if status repo exists
  async statusRepoExists(): Promise<boolean> {
    const repos = await this.getReposInOrg();
    return repos.some((repo) => {
      return repo.name === this.credStatusRepoName;
    });
  }

  // Create status repo
  async createStatusRepo(): Promise<void> {
    const repoRequestConfig = {
      name: this.credStatusRepoName,
      namespace_id: this.credStatusRepoOrgId,
      visibility: this.credStatusRepoVisibility,
      pages_access_level: 'public',
      description: 'Manages credential status for instance of VC-API'
    };
    const repoResponse = (await this.client.post(this.reposEndpoint(), repoRequestConfig)).data;
    this.credStatusRepoId = repoResponse.id;
  }

  // Sync status repo state
  async syncStatusRepoState(): Promise<void> {
    const repos = await this.getReposInOrg();
    const repoOrg = repos.find((repo) => {
      return repo.name === this.credStatusRepoName;
    });
    this.credStatusRepoId = repoOrg.id;
  }

  // Create data in config file
  async createConfigData(data: any): Promise<void> {
    const timestamp = (new Date()).toISOString();
    const message = `[${timestamp}]: created status credential config`;
    const content = JSON.stringify(data, null, 2);
    const configRequestConfig = {
      branch: CREDENTIAL_STATUS_REPO_BRANCH_NAME,
      commit_message: message,
      content
    };
    await this.client.post(this.filesEndpoint(CREDENTIAL_STATUS_CONFIG_PATH_ENCODED), configRequestConfig);
  }

  // Retrieve response from fetching config file
  async readConfigResponse(): Promise<any> {
    const configRequestConfig = {
      params: {
        ref: CREDENTIAL_STATUS_REPO_BRANCH_NAME
      }
    };
    const configResponse = await this.client.get(this.filesEndpoint(CREDENTIAL_STATUS_CONFIG_PATH_ENCODED), configRequestConfig);
    return configResponse.data as any;
  }

  // Retrieve data from config file
  async readConfigData(): Promise<any> {
    const configResponse = await this.readConfigResponse();
    return decodeSystemData(configResponse.content);
  }

  // Update data in config file
  async updateConfigData(data: any): Promise<void> {
    const timestamp = (new Date()).toISOString();
    const message = `[${timestamp}]: updated status credential config`;
    const content = JSON.stringify(data, null, 2);
    const configRequestConfig = {
      branch: CREDENTIAL_STATUS_REPO_BRANCH_NAME,
      commit_message: message,
      content
    };
    await this.client.put(this.filesEndpoint(CREDENTIAL_STATUS_CONFIG_PATH_ENCODED), configRequestConfig);
  }

  // Create data in log file
  async createLogData(data: any): Promise<void> {
    const timestamp = (new Date()).toISOString();
    const message = `[${timestamp}]: created status log`;
    const content = JSON.stringify(data, null, 2);
    const logRequestConfig = {
      branch: CREDENTIAL_STATUS_REPO_BRANCH_NAME,
      commit_message: message,
      content
    };
    await this.client.post(this.filesEndpoint(CREDENTIAL_STATUS_LOG_PATH_ENCODED), logRequestConfig);
  }

  // Retrieve response from fetching log file
  async readLogResponse(): Promise<any> {
    const logRequestConfig = {
      params: {
        ref: CREDENTIAL_STATUS_REPO_BRANCH_NAME
      }
    };
    const logResponse = await this.client.get(this.filesEndpoint(CREDENTIAL_STATUS_LOG_PATH_ENCODED), logRequestConfig);
    return logResponse.data as any;
  }

  // Retrieve data from log file
  async readLogData(): Promise<any> {
    const logResponse = await this.readLogResponse();
    return decodeSystemData(logResponse.content);
  }

  // Update data in log file
  async updateLogData(data: any): Promise<void> {
    const timestamp = (new Date()).toISOString();
    const message = `[${timestamp}]: updated status log`;
    const content = JSON.stringify(data, null, 2);
    const logRequestConfig = {
      branch: CREDENTIAL_STATUS_REPO_BRANCH_NAME,
      commit_message: message,
      content
    };
    await this.client.put(this.filesEndpoint(CREDENTIAL_STATUS_LOG_PATH_ENCODED), logRequestConfig);
  }

  // Create data in status file
  async createStatusData(data: any): Promise<void> {
    const configData = await this.readConfigData();
    const { latestList } = configData;
    const timestamp = (new Date()).toISOString();
    const message = `[${timestamp}]: created status credential`;
    const content = JSON.stringify(data, null, 2);
    const statusRequestConfig = {
      branch: CREDENTIAL_STATUS_REPO_BRANCH_NAME,
      commit_message: message,
      content
    };
    const statusPath = encodeURIComponent(latestList);
    await this.client.post(this.filesEndpoint(statusPath), statusRequestConfig);
  }

  // Retrieve response from fetching status file
  async readStatusResponse(): Promise<any> {
    const configData = await this.readConfigData();
    const { latestList } = configData;
    const statusRequestConfig = {
      params: {
        ref: CREDENTIAL_STATUS_REPO_BRANCH_NAME
      }
    };
    const statusPath = encodeURIComponent(latestList);
    const statusResponse = await this.client.get(this.filesEndpoint(statusPath), statusRequestConfig);
    return statusResponse.data as any;
  }

  // Retrieve data from status file
  async readStatusData(): Promise<any> {
    const statusResponse = await this.readStatusResponse();
    return decodeSystemData(statusResponse.content);
  }

  // Update data in status file
  async updateStatusData(data: any): Promise<void> {
    const configData = await this.readConfigData();
    const { latestList } = configData;
    const timestamp = (new Date()).toISOString();
    const message = `[${timestamp}]: updated status credential`;
    const content = JSON.stringify(data, null, 2);
    const statusRequestConfig = {
      branch: CREDENTIAL_STATUS_REPO_BRANCH_NAME,
      commit_message: message,
      content
    };
    const statusPath = encodeURIComponent(latestList);
    await this.client.put(this.filesEndpoint(statusPath), statusRequestConfig);
  }
}
