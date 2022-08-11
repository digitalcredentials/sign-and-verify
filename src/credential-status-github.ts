import { Octokit } from '@octokit/rest';
import {
  CREDENTIAL_STATUS_CONFIG_FILE,
  CREDENTIAL_STATUS_LOG_FILE,
  BaseCredentialStatusClient,
  VisibilityLevel,
  decodeSystemData,
  encodeAsciiAsBase64,
} from './credential-status';

export type GithubCredentialStatusClientParameters = {
  credStatusRepoName: string;
  credStatusRepoOwner: string;
  credStatusRepoVisibility: VisibilityLevel;
  githubApiAccessToken: string;
};

export class GithubCredentialStatusClient extends BaseCredentialStatusClient {
  private credStatusRepoName: string;
  private credStatusRepoOwner: string;
  private credStatusRepoVisibility: VisibilityLevel;
  private client: Octokit;

  constructor(config: GithubCredentialStatusClientParameters) {
    super();
    this.credStatusRepoName = config.credStatusRepoName;
    this.credStatusRepoOwner = config.credStatusRepoOwner;
    this.credStatusRepoVisibility = config.credStatusRepoVisibility;
    this.client = new Octokit({ auth: config.githubApiAccessToken });
  }

  // Get credential status url
  getCredentialStatusUrl(): string {
    return `https://${this.credStatusRepoOwner}.github.io/${this.credStatusRepoName}`;
  }

  // Check if status repo exists
  async statusRepoExists(): Promise<boolean> {
    const repos = await this.client.repos.listForAuthenticatedUser();
    const credStatusRepoExists = repos.data.some((repo) => {
      return repo.name === this.credStatusRepoName;
    });
    return credStatusRepoExists;
  }

  // Create status repo
  async createStatusRepo(): Promise<void> {
    await this.client.repos.createInOrg({
      org: this.credStatusRepoOwner,
      name: this.credStatusRepoName,
      visibility: this.credStatusRepoVisibility,
      description: 'Manages credential status for instance of VC-API'
    });
  }

  // Create data in config file
  async createConfigData(data: any) {
    const timestamp = (new Date()).toISOString();
    const message = `[${timestamp}]: updated status credential config`;
    const content = encodeAsciiAsBase64(JSON.stringify(data, null, 2));
    await this.client.repos.createOrUpdateFileContents({
      owner: this.credStatusRepoOwner,
      repo: this.credStatusRepoName,
      path: CREDENTIAL_STATUS_CONFIG_FILE,
      message,
      content
    });
  }

  // Retrieve response from fetching config file
  async readConfigResponse(): Promise<any> {
    const configResponse = await this.client.repos.getContent({
      owner: this.credStatusRepoOwner,
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
      owner: this.credStatusRepoOwner,
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
    const message = `[${timestamp}]: updated status log`;
    const content = encodeAsciiAsBase64(JSON.stringify(data, null, 2));
    await this.client.repos.createOrUpdateFileContents({
      owner: this.credStatusRepoOwner,
      repo: this.credStatusRepoName,
      path: CREDENTIAL_STATUS_LOG_FILE,
      message,
      content
    });
  }

  // Retrieve response from fetching log file
  async readLogResponse(): Promise<any> {
    const logResponse = await this.client.repos.getContent({
      owner: this.credStatusRepoOwner,
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
      owner: this.credStatusRepoOwner,
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
    const message = `[${timestamp}]: updated status credential`;
    const content = encodeAsciiAsBase64(JSON.stringify(data, null, 2));
    await this.client.repos.createOrUpdateFileContents({
      owner: this.credStatusRepoOwner,
      repo: this.credStatusRepoName,
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
      owner: this.credStatusRepoOwner,
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
      owner: this.credStatusRepoOwner,
      repo: this.credStatusRepoName,
      path: latestList,
      message,
      content,
      sha
    });
  }
}