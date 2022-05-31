const { createList, createCredential } = require('@digitalbazaar/vc-status-list');
import { CONTEXT_URL_V1 } from '@digitalbazaar/vc-status-list-context';
import fs from 'fs';

const CREDENTIAL_STATUS_BLOCK_SIZE = 130000;

// Compose StatusList2021Credential
export const composeStatusCredential = async (issuerDid: string, credentialId: string, statusList?: any): Promise<any> => {
  if (!statusList) {
    statusList = await createList({length: 100000});
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
export const embedCredentialStatus = (credential: any): any => {
  // Retrieve status config
  const statusDir = `${__dirname}/../credentials/status`;
  const statusCredentialConfigFile = `${statusDir}/config.json`;
  const statusCredentialConfig = JSON.parse(fs.readFileSync(statusCredentialConfigFile, { encoding: 'utf8' }));

  let credentialsIssued = statusCredentialConfig.credentialsIssued;
  let latestBlock = statusCredentialConfig.latestBlock;
  let newBlock = undefined;
  if (credentialsIssued >= CREDENTIAL_STATUS_BLOCK_SIZE) {
    // Update status config data
    latestBlock = Math.random().toString(36).substring(2,12).toUpperCase();
    newBlock = latestBlock;
    credentialsIssued = 0;
  }
  credentialsIssued++;

  // Update status config
  statusCredentialConfig.credentialsIssued = credentialsIssued;
  statusCredentialConfig.latestBlock = latestBlock;
  const statusCredentialConfigString = JSON.stringify(statusCredentialConfig, null, 2);
  fs.writeFileSync(statusCredentialConfigFile, statusCredentialConfigString);

  // Attach credential status
  const statusListIndex = credentialsIssued;
  const statusListCredential = `https://example.com/credentials/status/${latestBlock}`;
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
    newBlock
  };
};
