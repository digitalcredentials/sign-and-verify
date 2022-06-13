const { createList, createCredential } = require('@digitalbazaar/vc-status-list');
import { CONTEXT_URL_V1 } from '@digitalbazaar/vc-status-list-context';
import fs from 'fs';
import { getConfig } from './config';

// Number of credentials tracked in a list
const CREDENTIAL_STATUS_LIST_SIZE = 100000;

// Actions applied to credentials and tracked in status log
export enum CredentialAction {
  Issued = 'issued',
  Revoked = 'revoked'
}

// Compose StatusList2021Credential
export const composeStatusCredential = async (issuerDid: string, credentialId: string, statusList?: any): Promise<any> => {
  if (!statusList) {
    statusList = await createList({ length: CREDENTIAL_STATUS_LIST_SIZE });
  }
  const issuanceDate = (new Date()).toISOString();
  let credential = await createCredential({ id: credentialId, list: statusList });
  credential = {
    ...credential,
    issuer: issuerDid,
    issuanceDate
  };
  return credential;
}

// Embed status into credential
export const embedCredentialStatus = (credential: any, apiUrl: string): any => {
  // Retrieve status config
  const statusDir = `${__dirname}/../credentials/status`;
  const statusCredentialConfigFile = `${statusDir}/config.json`;
  const statusCredentialConfig = JSON.parse(fs.readFileSync(statusCredentialConfigFile, { encoding: 'utf8' }));

  let credentialsIssued = statusCredentialConfig.credentialsIssued;
  let latestList = statusCredentialConfig.latestList;
  let newList = undefined;
  if (credentialsIssued >= CREDENTIAL_STATUS_LIST_SIZE) {
    // Update status config data
    latestList = Math.random().toString(36).substring(2,12).toUpperCase();
    newList = latestList;
    credentialsIssued = 0;
  }
  credentialsIssued++;

  // Update status config
  statusCredentialConfig.credentialsIssued = credentialsIssued;
  statusCredentialConfig.latestList = latestList;
  const statusCredentialConfigString = JSON.stringify(statusCredentialConfig, null, 2);
  fs.writeFileSync(statusCredentialConfigFile, statusCredentialConfigString);

  // Attach credential status
  const statusListIndex = credentialsIssued;
  const statusListCredential = `${apiUrl}/credentials/status/${latestList}`;
  const statusListId = `${statusListCredential}#${statusListIndex}`;
  const statusListType = 'StatusList2021Entry';
  const credentialStatus = {
    id: statusListId,
    type: statusListType,
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
