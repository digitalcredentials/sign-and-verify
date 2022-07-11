const { createList, createCredential } = require('@digitalbazaar/vc-status-list');
import { CONTEXT_URL_V1 } from '@digitalbazaar/vc-status-list-context';
import { Octokit } from '@octokit/rest';

// Number of credentials tracked in a list
const CREDENTIAL_STATUS_LIST_SIZE = 100000;
const CREDENTIAL_STATUS_TYPE = 'StatusList2021Entry';
export const CREDENTIAL_STATUS_FOLDER = 'credentials/status';
export const CREDENTIAL_STATUS_CONFIG_FILE = 'config.json';
export const CREDENTIAL_STATUS_LOG_FILE = 'log.json';

// Actions applied to credentials and tracked in status log
export enum SystemFile {
  Config = 'config',
  Log = 'log',
  Status = 'status'
}

// Actions applied to credentials and tracked in status log
export enum CredentialAction {
  Issued = 'issued',
  Revoked = 'revoked'
}

export type CredentialStatusConfig = {
  credentialsIssued: number;
  latestList: string;
};

export type CredentialStatusLogEntry = {
  timestamp: string;
  credentialId?: string;
  credentialSubject?: string;
  credentialAction: CredentialAction;
  issuerDid: string;
  verificationMethod: string;
  statusListCredential: string;
  statusListIndex: number;
};

type ComposeStatusCredentialParameters = {
  issuerDid: string;
  credentialId: string;
  statusList?: any;
  statusPurpose?: string;
};

type EmbedCredentialStatusParameters = {
  credential: any;
  statusPurpose?: string;
};

type EmbedCredentialStatusResult = {
  credential: any;
  newList: string | undefined;
};

export class GithubCredStatusClient {
  private githubOrg: string;
  private githubCredStatusRepo: string;
  private client: Octokit;

  constructor(githubOauthToken: string, githubOrg: string, githubCredStatusRepo: string) {
    this.githubOrg = githubOrg;
    this.githubCredStatusRepo = githubCredStatusRepo;
    this.client = new Octokit({ auth: githubOauthToken });
  }

  // Get credential status url
  getCredentialStatusUrl() {
    return `https://${this.githubOrg}.github.io/${this.githubCredStatusRepo}`;
  }

  // Embed status into credential
  async embedCredentialStatus({ credential, statusPurpose = 'revocation' }: EmbedCredentialStatusParameters): Promise<EmbedCredentialStatusResult> {
    // Retrieve status config
    const configData = await this.readConfigData();

    let { credentialsIssued, latestList } = configData;
    let newList;
    if (credentialsIssued >= CREDENTIAL_STATUS_LIST_SIZE) {
      // Update status config data
      latestList = generateStatusListId();
      newList = latestList;
      credentialsIssued = 0;
    }
    credentialsIssued++;

    // Update status config
    configData.credentialsIssued = credentialsIssued;
    configData.latestList = latestList;
    await this.updateConfigData(configData);

    // Attach credential status
    const statusUrl = this.getCredentialStatusUrl();
    const statusListCredential = `${statusUrl}/${latestList}`;
    const statusListIndex = credentialsIssued;
    const statusListId = `${statusListCredential}#${statusListIndex}`;
    const credentialStatus = {
      id: statusListId,
      type: CREDENTIAL_STATUS_TYPE,
      statusPurpose,
      statusListIndex,
      statusListCredential
    };
    return {
      credential: {
        ...credential,
        credentialStatus,
        '@context': [...credential['@context'], CONTEXT_URL_V1]
      },
      newList
    };
  }

  // Check if status repo exists
  async statusRepoExists(): Promise<boolean> {
    const repos = await this.client.rest.repos.listForOrg({ org: this.githubOrg });
    const credStatusRepoExists = repos.data.some((repo) => {
      return repo.name === this.githubCredStatusRepo;
    });
    return credStatusRepoExists;
  }

  // Create status repo
  async createStatusRepo() {
    await this.client.rest.repos.createInOrg({
      org: this.githubOrg,
      name: this.githubCredStatusRepo,
      description: 'Manages credential status for instance of VC-API',
      visibility: 'public' // TODO: GitHub Pages works only for public repos on free plans
    });
  }

  // Create data in config file
  async createConfigData(data: any) {
    const timestamp = (new Date()).toISOString();
    const message = `[${timestamp}]: updated status credential config`;
    const content = encodeAsciiAsBase64(JSON.stringify(data, null, 2));
    await this.client.rest.repos.createOrUpdateFileContents({
      owner: this.githubOrg,
      repo: this.githubCredStatusRepo,
      path: CREDENTIAL_STATUS_CONFIG_FILE,
      message,
      content
    });
  }

  // Retrieve response from fetching config file
  async readConfigResponse(): Promise<any> {
    const configResponse = await this.client.rest.repos.getContent({
      owner: this.githubOrg,
      repo: this.githubCredStatusRepo,
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
    await this.client.rest.repos.createOrUpdateFileContents({
      owner: this.githubOrg,
      repo: this.githubCredStatusRepo,
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
    await this.client.rest.repos.createOrUpdateFileContents({
      owner: this.githubOrg,
      repo: this.githubCredStatusRepo,
      path: CREDENTIAL_STATUS_LOG_FILE,
      message,
      content
    });
  }

  // Retrieve response from fetching log file
  async readLogResponse(): Promise<any> {
    const logResponse = await this.client.rest.repos.getContent({
      owner: this.githubOrg,
      repo: this.githubCredStatusRepo,
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
    await this.client.rest.repos.createOrUpdateFileContents({
      owner: this.githubOrg,
      repo: this.githubCredStatusRepo,
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
    await this.client.rest.repos.createOrUpdateFileContents({
      owner: this.githubOrg,
      repo: this.githubCredStatusRepo,
      path: latestList,
      message,
      content
    });
  }

  // Retrieve response from fetching status file
  async readStatusResponse(): Promise<any> {
    const configData = await this.readConfigData();
    const { latestList } = configData;
    const statusResponse = await this.client.rest.repos.getContent({
      owner: this.githubOrg,
      repo: this.githubCredStatusRepo,
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
    await this.client.rest.repos.createOrUpdateFileContents({
      owner: this.githubOrg,
      repo: this.githubCredStatusRepo,
      path: latestList,
      message,
      content,
      sha
    });
  }
}

// Generate new status list ID
export const generateStatusListId = () => {
  return Math.random().toString(36).substring(2,12).toUpperCase();
};

// Compose StatusList2021Credential
export const composeStatusCredential = async ({ issuerDid, credentialId, statusList, statusPurpose = 'revocation' }: ComposeStatusCredentialParameters): Promise<any> => {
  if (!statusList) {
    statusList = await createList({ length: CREDENTIAL_STATUS_LIST_SIZE });
  }
  const issuanceDate = (new Date()).toISOString();
  let credential = await createCredential({ id: credentialId, list: statusList });
  credential = {
    ...credential,
    credentialSubject: { ...credential.credentialSubject, statusPurpose },
    issuer: issuerDid,
    issuanceDate
  };
  return credential;
}

const encodeAsciiAsBase64 = (text: string): string => {
  return Buffer.from(text).toString('base64');
};

const decodeBase64AsAscii = (text: string): string => {
  return Buffer.from(text, 'base64').toString('ascii');
};

const decodeSystemData = (text: string): any => {
  return JSON.parse(decodeBase64AsAscii(text));
};
