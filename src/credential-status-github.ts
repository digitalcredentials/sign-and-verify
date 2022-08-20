import { Octokit } from '@octokit/rest';
import {
  CREDENTIAL_STATUS_CONFIG_FILE,
  CREDENTIAL_STATUS_LOG_FILE,
  CREDENTIAL_STATUS_REPO_BRANCH_NAME,
  BaseCredentialStatusClient,
  VisibilityLevel,
  decodeSystemData,
  encodeAsciiAsBase64,
} from './credential-status';

// Type definition for GithubCredentialStatusClient constructor method
export type GithubCredentialStatusClientParameters = {
  credStatusRepoName: string;
  credStatusRepoOrgName: string;
  credStatusRepoVisibility: VisibilityLevel;
  credStatusClientAccessToken: string;
};

// Implementation of BaseCredentialStatusClient for GitHub
export class GithubCredentialStatusClient extends BaseCredentialStatusClient {
  private credStatusRepoName: string;
  private credStatusRepoOrgName: string;
  private credStatusRepoVisibility: VisibilityLevel;
  private client: Octokit;

  constructor(config: GithubCredentialStatusClientParameters) {
    super();
    this.credStatusRepoName = config.credStatusRepoName;
    this.credStatusRepoOrgName = config.credStatusRepoOrgName;
    this.credStatusRepoVisibility = config.credStatusRepoVisibility;
    this.client = new Octokit({ auth: config.credStatusClientAccessToken });
  }

  // Get credential status url
  getCredentialStatusUrl(): string {
    return `https://${this.credStatusRepoOrgName}.github.io/${this.credStatusRepoName}`;
  }

  // Setup website to host credential status management resources
  async setupCredentialStatusWebsite(): Promise<void> {
    const timestamp = (new Date()).toISOString();
    const message = `[${timestamp}]: setup status website`;
    await this.client.repos.createPagesSite({
      owner: this.credStatusRepoOrgName,
      repo: this.credStatusRepoName,
      source: { branch: CREDENTIAL_STATUS_REPO_BRANCH_NAME }
    });
  }

  // Check if status repo exists
  async statusRepoExists(): Promise<boolean> {
    const repos = await this.client.repos.listForAuthenticatedUser();
    return repos.data.some((repo) => {
      return repo.name === this.credStatusRepoName;
    });
  }

  // Create status repo
  async createStatusRepo(): Promise<void> {
    await this.client.repos.createInOrg({
      org: this.credStatusRepoOrgName,
      name: this.credStatusRepoName,
      visibility: this.credStatusRepoVisibility,
      description: 'Manages credential status for instance of VC-API'
    });
  }

  // Create data in config file
  async createConfigData(data: any) {
    const timestamp = (new Date()).toISOString();
    const message = `[${timestamp}]: created status credential config`;
    const content = encodeAsciiAsBase64(JSON.stringify(data, null, 2));
    await this.client.repos.createOrUpdateFileContents({
      owner: this.credStatusRepoOrgName,
      repo: this.credStatusRepoName,
      branch: CREDENTIAL_STATUS_REPO_BRANCH_NAME,
      path: CREDENTIAL_STATUS_CONFIG_FILE,
      message,
      content
    });
  }

  // Retrieve response from fetching config file
  async readConfigResponse(): Promise<any> {
    const configResponse = await this.client.repos.getContent({
      owner: this.credStatusRepoOrgName,
      repo: this.credStatusRepoName,
      path: CREDENTIAL_STATUS_CONFIG_FILE
    });
    return configResponse.data as any;
  }

  // Retrieve data from config file
  async readConfigData(): Promise<any> {
    const configResponse = await this.readConfigResponse();
    return decodeSystemData(configResponse.content);
  }

  // Update data in config file
  async updateConfigData(data: any) {
    const configResponse = await this.readConfigResponse();
    const { sha } = configResponse;
    const timestamp = (new Date()).toISOString();
    const message = `[${timestamp}]: updated status credential config`;
    const content = encodeAsciiAsBase64(JSON.stringify(data, null, 2));
    await this.client.repos.createOrUpdateFileContents({
      owner: this.credStatusRepoOrgName,
      repo: this.credStatusRepoName,
      path: CREDENTIAL_STATUS_CONFIG_FILE,
      message,
      content,
      sha
    });
  }

  // Create data in log file
  async createLogData(data: any) {
    const timestamp = (new Date()).toISOString();
    const message = `[${timestamp}]: created status log`;
    const content = encodeAsciiAsBase64(JSON.stringify(data, null, 2));
    await this.client.repos.createOrUpdateFileContents({
      owner: this.credStatusRepoOrgName,
      repo: this.credStatusRepoName,
      branch: CREDENTIAL_STATUS_REPO_BRANCH_NAME,
      path: CREDENTIAL_STATUS_LOG_FILE,
      message,
      content
    });
  }

  // Retrieve response from fetching log file
  async readLogResponse(): Promise<any> {
    const logResponse = await this.client.repos.getContent({
      owner: this.credStatusRepoOrgName,
      repo: this.credStatusRepoName,
      path: CREDENTIAL_STATUS_LOG_FILE
    });
    return logResponse.data as any;
  }

  // Retrieve data from log file
  async readLogData(): Promise<any> {
    const logResponse = await this.readLogResponse();
    return decodeSystemData(logResponse.content);
  }

  // Update data in log file
  async updateLogData(data: any) {
    const logResponse = await this.readLogResponse();
    const { sha } = logResponse;
    const timestamp = (new Date()).toISOString();
    const message = `[${timestamp}]: updated status log`;
    const content = encodeAsciiAsBase64(JSON.stringify(data, null, 2));
    await this.client.repos.createOrUpdateFileContents({
      owner: this.credStatusRepoOrgName,
      repo: this.credStatusRepoName,
      path: CREDENTIAL_STATUS_LOG_FILE,
      message,
      content,
      sha
    });
  }

  // Create data in status file
  async createStatusData(data: any) {
    const configData = await this.readConfigData();
    const { latestList } = configData;
    const timestamp = (new Date()).toISOString();
    const message = `[${timestamp}]: created status credential`;
    const content = encodeAsciiAsBase64(JSON.stringify(data, null, 2));
    await this.client.repos.createOrUpdateFileContents({
      owner: this.credStatusRepoOrgName,
      repo: this.credStatusRepoName,
      branch: CREDENTIAL_STATUS_REPO_BRANCH_NAME,
      path: latestList,
      message,
      content
    });
  }

  // Retrieve response from fetching status file
  async readStatusResponse(): Promise<any> {
    const configData = await this.readConfigData();
    const { latestList } = configData;
    const statusResponse = await this.client.repos.getContent({
      owner: this.credStatusRepoOrgName,
      repo: this.credStatusRepoName,
      path: latestList
    });
    return statusResponse.data as any;
  }

  // Retrieve data from status file
  async readStatusData(): Promise<any> {
    const statusResponse = await this.readStatusResponse();
    return decodeSystemData(statusResponse.content);
  }

  // Update data in status file
  async updateStatusData(data: any) {
    const configData = await this.readConfigData();
    const { latestList } = configData;
    const statusResponse = await this.readStatusResponse();
    const { sha } = statusResponse;
    const timestamp = (new Date()).toISOString();
    const message = `[${timestamp}]: updated status credential`;
    const content = encodeAsciiAsBase64(JSON.stringify(data, null, 2));
    await this.client.repos.createOrUpdateFileContents({
      owner: this.credStatusRepoOrgName,
      repo: this.credStatusRepoName,
      path: latestList,
      message,
      content,
      sha
    });
  }
}
