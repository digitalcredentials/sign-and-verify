import { createList, createCredential } from '@digitalbazaar/vc-status-list';
import { CONTEXT_URL_V1 } from '@digitalbazaar/vc-status-list-context';

// Number of credentials tracked in a list
const CREDENTIAL_STATUS_LIST_SIZE = 100000;

// Credential status type
const CREDENTIAL_STATUS_TYPE = 'StatusList2021Entry';

// Name of credential status branch
export const CREDENTIAL_STATUS_REPO_BRANCH_NAME = 'main';

// Credential status resource names
export const CREDENTIAL_STATUS_CONFIG_FILE = 'config.json';
export const CREDENTIAL_STATUS_LOG_FILE = 'log.json';

// Type of credential status client
export enum CredentialStatusClientType {
  Github = 'github',
  Gitlab = 'gitlab',
  Internal = 'internal'
}

// Level of visibility of credential status management repo
export enum VisibilityLevel {
  Public = 'public',
  Private = 'private',
  Internal = 'internal'
}

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

// Type definition for credential status config file
export type CredentialStatusConfig = {
  credentialsIssued: number;
  latestList: string;
};

// Type definition for credential status log entry
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

// Type definition for composeStatusCredential function input
type ComposeStatusCredentialParameters = {
  issuerDid: string;
  credentialId: string;
  statusList?: any;
  statusPurpose?: string;
};

// Type definition for embedCredentialStatus method input
type EmbedCredentialStatusParameters = {
  credential: any;
  statusPurpose?: string;
};

// Type definition for embedCredentialStatus method output
type EmbedCredentialStatusResult = {
  credential: any;
  newList: string | undefined;
};

// Base class for credential status clients
export abstract class BaseCredentialStatusClient {
  // Generate new status list ID
  generateStatusListId(): string {
    return Math.random().toString(36).substring(2,12).toUpperCase();
  }

  // Embed status into credential
  async embedCredentialStatus({ credential, statusPurpose = 'revocation' }: EmbedCredentialStatusParameters): Promise<EmbedCredentialStatusResult> {
    // Retrieve status config
    const configData = await this.readConfigData();

    let { credentialsIssued, latestList } = configData;
    let newList;
    if (credentialsIssued >= CREDENTIAL_STATUS_LIST_SIZE) {
      // Update status config data
      latestList = this.generateStatusListId();
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

  // Get credential status url
  abstract getCredentialStatusUrl(): string;

  // Setup website to host credential status management resources
  async setupCredentialStatusWebsite(): Promise<void> {};

  // Check if status repo exists
  abstract statusRepoExists(): Promise<boolean>;

  // Create status repo
  abstract createStatusRepo(): Promise<void>;

  // Sync status repo state
  async syncStatusRepoState(): Promise<void> {};

  // Create data in config file
  abstract createConfigData(data: any): Promise<void>;

  // Retrieve data from config file
  abstract readConfigData(): Promise<any>;

  // Update data in config file
  abstract updateConfigData(data: any): Promise<void>;

  // Create data in log file
  abstract createLogData(data: any): Promise<void>;

  // Retrieve data from log file
  abstract readLogData(): Promise<any>;

  // Update data in log file
  abstract updateLogData(data: any): Promise<void>;

  // Create data in status file
  abstract createStatusData(data: any): Promise<void>;

  // Retrieve data from status file
  abstract readStatusData(): Promise<any>;

  // Update data in status file
  abstract updateStatusData(data: any): Promise<void>;
}

// Compose StatusList2021Credential
export const composeStatusCredential = async ({ issuerDid, credentialId, statusList, statusPurpose = 'revocation' }: ComposeStatusCredentialParameters): Promise<any> => {
  if (!statusList) {
    statusList = await createList({ length: CREDENTIAL_STATUS_LIST_SIZE });
  }
  const issuanceDate = (new Date()).toISOString();
  let credential = await createCredential({ id: credentialId, list: statusList, statusPurpose });
  credential = {
    ...credential,
    issuer: issuerDid,
    issuanceDate
  };
  return credential;
}

export const decodeSystemData = (text: string): any => {
  return JSON.parse(decodeBase64AsAscii(text));
};

export const encodeAsciiAsBase64 = (text: string): string => {
  return Buffer.from(text).toString('base64');
};

const decodeBase64AsAscii = (text: string): string => {
  return Buffer.from(text, 'base64').toString('ascii');
};
