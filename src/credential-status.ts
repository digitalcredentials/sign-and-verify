const { createList, createCredential } = require('@digitalbazaar/vc-status-list');
import { CONTEXT_URL_V1 } from '@digitalbazaar/vc-status-list-context';
import { Octokit } from '@octokit/rest';
import { getConfig } from './config';

// Environment variables
const {
  githubOauthToken,
  githubOrg,
  githubCredStatusRepo
} = getConfig();

// GitHub SDK
const githubOauthTokenString = githubOauthToken as string;
const githubOrgString = githubOrg as string;
const githubCredStatusRepoString = githubCredStatusRepo as string;
const octokit = new Octokit({ auth: githubOauthTokenString });

// Number of credentials tracked in a list
const CREDENTIAL_STATUS_TYPE = 'StatusList2021Entry';
const CREDENTIAL_STATUS_LIST_SIZE = 100000;
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
  statusUrl: string;
  statusPurpose?: string;
};

// Get credential status url
export const getCredentialStatusUrl = () => {
  return `https://${githubOrg}.github.io/${githubCredStatusRepo}`
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

// Embed status into credential
export const embedCredentialStatus = async ({ credential, statusUrl, statusPurpose = 'revocation' }: EmbedCredentialStatusParameters): Promise<any> => {
  // Retrieve status config
  const configData = await readConfigData();

  let { credentialsIssued, latestList } = configData;
  let newList = undefined;
  if (credentialsIssued >= CREDENTIAL_STATUS_LIST_SIZE) {
    // Update status config data
    latestList = Math.random().toString(36).substring(2,12).toUpperCase();
    newList = latestList;
    credentialsIssued = 0;
  }
  credentialsIssued++;

  // Update status config
  configData.credentialsIssued = credentialsIssued;
  configData.latestList = latestList;
  await updateConfigData(configData);

  // Attach credential status
  const statusListIndex = credentialsIssued;
  const statusListCredential = `${statusUrl}/${CREDENTIAL_STATUS_FOLDER}/${latestList}`;
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
};

const encodeAsciiAsBase64 = (text: string): string => {
  return Buffer.from(text).toString('base64');
};

const decodeBase64AsAscii = (text: string): string => {
  return Buffer.from(text, 'base64').toString('ascii');
};

const decodeSystemData = (text: string): any => {
  return JSON.parse(decodeBase64AsAscii(text));
};

// Create data in config file
export const createConfigData = async (data: any) => {
  const timestamp = (new Date()).toISOString();
  const message = `[${timestamp}]: updated status credential config`;
  const content = encodeAsciiAsBase64(JSON.stringify(data, null, 2));
  await octokit.rest.repos.createOrUpdateFileContents({
    owner: githubOrgString,
    repo: githubCredStatusRepoString,
    path: CREDENTIAL_STATUS_CONFIG_FILE,
    message,
    content
  });
};

// Retrieve response from fetching config file
const readConfigResponse = async (): Promise<any> => {
  const configResponse = await octokit.rest.repos.getContent({
    owner: githubOrgString,
    repo: githubCredStatusRepoString,
    path: CREDENTIAL_STATUS_CONFIG_FILE
  });
  return configResponse.data as any;
};

// Retrieve data from config file
export const readConfigData = async (): Promise<any> => {
  const configResponse = await readConfigResponse();
  return decodeSystemData(configResponse.content);
};

// Update data in config file
export const updateConfigData = async (data: any) => {
  const configResponse = await readConfigResponse();
  const { sha } = configResponse;
  const timestamp = (new Date()).toISOString();
  const message = `[${timestamp}]: updated status credential config`;
  const content = encodeAsciiAsBase64(JSON.stringify(data, null, 2));
  await octokit.rest.repos.createOrUpdateFileContents({
    owner: githubOrgString,
    repo: githubCredStatusRepoString,
    path: CREDENTIAL_STATUS_CONFIG_FILE,
    message,
    content,
    sha
  });
};

// Create data in log file
export const createLogData = async (data: any) => {
  const timestamp = (new Date()).toISOString();
  const message = `[${timestamp}]: updated status log`;
  const content = encodeAsciiAsBase64(JSON.stringify(data, null, 2));
  await octokit.rest.repos.createOrUpdateFileContents({
    owner: githubOrgString,
    repo: githubCredStatusRepoString,
    path: CREDENTIAL_STATUS_LOG_FILE,
    message,
    content
  });
};

// Retrieve response from fetching log file
const readLogResponse = async (): Promise<any> => {
  const logResponse = await octokit.rest.repos.getContent({
    owner: githubOrgString,
    repo: githubCredStatusRepoString,
    path: CREDENTIAL_STATUS_LOG_FILE
  });
  return logResponse.data as any;
};

// Retrieve data from log file
export const readLogData = async (): Promise<any> => {
  const logResponse = await readLogResponse();
  return decodeSystemData(logResponse.content);
};

// Update data in log file
export const updateLogData = async (data: any) => {
  const logResponse = await readLogResponse();
  const { sha } = logResponse;
  const timestamp = (new Date()).toISOString();
  const message = `[${timestamp}]: updated status log`;
  const content = encodeAsciiAsBase64(JSON.stringify(data, null, 2));
  await octokit.rest.repos.createOrUpdateFileContents({
    owner: githubOrgString,
    repo: githubCredStatusRepoString,
    path: CREDENTIAL_STATUS_LOG_FILE,
    message,
    content,
    sha
  });
};

// Create data in status file
export const createStatusData = async (data: any) => {
  const configData = await readConfigData();
  const { latestList } = configData;
  const statusDataFile = `${latestList}.json`;
  const timestamp = (new Date()).toISOString();
  const message = `[${timestamp}]: updated status credential`;
  const content = encodeAsciiAsBase64(JSON.stringify(data, null, 2));
  await octokit.rest.repos.createOrUpdateFileContents({
    owner: githubOrgString,
    repo: githubCredStatusRepoString,
    path: statusDataFile,
    message,
    content
  });
};

// Retrieve response from fetching status file
const readStatusResponse = async (): Promise<any> => {
  const configData = await readConfigData();
  const { latestList } = configData;
  const statusDataPath = `${latestList}.json`;
  const statusResponse = await octokit.rest.repos.getContent({
    owner: githubOrgString,
    repo: githubCredStatusRepoString,
    path: statusDataPath
  });
  return statusResponse.data as any;
};

// Retrieve data from status file
export const readStatusData = async (): Promise<any> => {
  const statusResponse = await readStatusResponse();
  return decodeSystemData(statusResponse.content);
};

// Update data in status file
export const updateStatusData = async (data: any) => {
  const configData = await readConfigData();
  const { latestList } = configData;
  const statusDataFile = `${latestList}.json`;
  const statusResponse = await readStatusResponse();
  const { sha } = statusResponse;
  const timestamp = (new Date()).toISOString();
  const message = `[${timestamp}]: updated status credential`;
  const content = encodeAsciiAsBase64(JSON.stringify(data, null, 2));
  await octokit.rest.repos.createOrUpdateFileContents({
    owner: githubOrgString,
    repo: githubCredStatusRepoString,
    path: statusDataFile,
    message,
    content,
    sha
  });
};

// Check if status repo exists
export const statusRepoExists = async (): Promise<boolean> => {
  const repos = await octokit.rest.repos.listForOrg({ org: githubOrgString });
  const credStatusRepoExists = repos.data.some((repo) => {
    return repo.name === githubCredStatusRepoString;
  });
  return credStatusRepoExists;
};

// Create status repo
export const createStatusRepo = async () => {
  await octokit.rest.repos.createInOrg({
    org: githubOrgString,
    name: githubCredStatusRepoString,
    description: 'Manages credential status for instance of VC-API',
    visibility: 'public' // TODO: GitHub Pages works only for public repos on free plans
  });
};
