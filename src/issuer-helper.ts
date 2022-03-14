// NOTE: The operations in this file are specific to MongoDB
// and the database schema used in early deployments of this code.
// You may modify the content of this file to suit your
// organization's DBMS/OIDC deployment infrastructure

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import Handlebars from 'handlebars';
import { Issuer } from 'openid-client';
import { dbCredClient } from './database';
import { getConfig } from './config';

export enum AuthType {
  OidcToken = 'OIDC_TOKEN',
  VpChallenge = 'VP_CHALLENGE'
}

// Return mapping from expiration date token (i.e., 'EXPIRATION_DATE')
// to expiration date database field (i.e., 'expirationDate') for given credential record.
// Otherwise, return null.
const getExpirationDate = (credentialRecord) => {
  return credentialRecord.expirationDate ? { EXPIRATION_DATE: credentialRecord.expirationDate } : null;
};

// NOTE: FEEL FREE TO ALTER IT TO CONTAIN LOGIC FOR RETRIEVING CREDENTIALS FOR LEARNERS IN YOUR ORG
// NOTE: HOLDER ID IS GENERATED FROM AN EXTERNAL WALLET, NOT THE ISSUER
// Method for issuer to retrieve credential on behalf of learner
const processCredentialRequestViaOidc = async (issuerId: string, holderId: string, accessToken: string): Promise<any> => {
  // NOTE: using one credential type for now
  // Select credential type
  const credentialType = 'Certificate';
  // NOTE: CREDENTIAL ID IS THE LEARNER EMAIL IN EARLY DEPLOYMENTS OF THIS CODE
  // Select credential primary key
  const primaryKey = 'credentialSubject.email';
  // Retrieve email from userinfo endpoint using OIDC token
  let email;
  try {
    const { oidcIssuerUrl } = getConfig();
    const oidcIssuer = await Issuer.discover(oidcIssuerUrl as string);
    const userinfoEndpoint = oidcIssuer.metadata.userinfo_endpoint as string;
    const userinfo = (await axios.get(userinfoEndpoint, { headers: { 'Authorization': `Bearer ${accessToken}` } })).data;
    email = userinfo.email;
    if (!email) {
      throw new Error;
    }
  } catch (error) {
    throw new Error('Could not retrieve email from userinfo endpoint using OIDC token');
  }

  const CredentialModel = await dbCredClient.open();
  const credentialQuery = { [primaryKey]: email };
  const credentialRecord = await CredentialModel.findOne(credentialQuery);
  await dbCredClient.close();
  if (!credentialRecord) {
    return Promise.resolve({});
  }

  // Populate credential config
  const credentialConfig = {
    ISSUER_DID: issuerId,
    LEARNER_DID: holderId,
    CREDENTIAL_NAME: credentialRecord.name,
    CREDENTIAL_DESC: credentialRecord.description,
    ISSUANCE_DATE: credentialRecord.issuanceDate,
    ...getExpirationDate(credentialRecord),
    ISSUER_NAME: credentialRecord.issuer.name,
    ISSUER_URL: credentialRecord.issuer.url,
    ISSUER_IMAGE: credentialRecord.issuer.image,
    LEARNER_NAME: credentialRecord.credentialSubject.name
  };

  // Select desired credential template
  const templateFileName = path.resolve(__dirname, `./templates/${credentialType}.txt`);
  const template = fs.readFileSync(templateFileName, { encoding:'utf8' });
  const templateHbars = Handlebars.compile(template);
  const credential = JSON.parse(templateHbars(credentialConfig));
  return Promise.resolve(credential);
};

// NOTE: FEEL FREE TO ALTER IT TO CONTAIN LOGIC FOR RETRIEVING CREDENTIALS FOR LEARNERS IN YOUR ORG
// NOTE: HOLDER ID IS GENERATED FROM AN EXTERNAL WALLET, NOT THE ISSUER
// Method for issuer to retrieve credential on behalf of learner
const processCredentialRequestViaVp = async (issuerId: string, holderId: string, metadataEncoded: string): Promise<any> => {
  // NOTE: using one credential type for now
  // Select credential type
  const credentialType = 'Certificate';
  // NOTE: CREDENTIAL ID IS THE LEARNER EMAIL IN EARLY DEPLOYMENTS OF THIS CODE
  // Select credential primary key
  const primaryKey = 'credentialSubject.email';
  // Extract email from VP challenge
  let email;
  try {
    const metadataBase64 = Buffer.from(metadataEncoded, 'base64');
    const metadataUtf8 = metadataBase64.toString('utf8');
    const metadata = JSON.parse(metadataUtf8);
    email = metadata.email;
    if (!email) {
      throw new Error;
    }
  } catch (error) {
    throw new Error('Could not extract email from VP challenge');
  }

  const CredentialModel = await dbCredClient.open();
  const credentialQuery = { [primaryKey]: email };
  const credentialRecord = await CredentialModel.findOne(credentialQuery);
  await dbCredClient.close();
  if (!credentialRecord) {
    return Promise.resolve({});
  }

  // Populate credential config
  const credentialConfig = {
    ISSUER_DID: issuerId,
    LEARNER_DID: holderId,
    CREDENTIAL_NAME: credentialRecord.name,
    CREDENTIAL_DESC: credentialRecord.description,
    ISSUANCE_DATE: credentialRecord.issuanceDate,
    ISSUER_NAME: credentialRecord.issuer.name,
    ISSUER_URL: credentialRecord.issuer.url,
    ISSUER_IMAGE: credentialRecord.issuer.image,
    LEARNER_NAME: credentialRecord.credentialSubject.name
  };

  // Select desired credential template
  const templateFileName = path.resolve(__dirname, `./templates/${credentialType}.json`);
  const template = fs.readFileSync(templateFileName, { encoding:'utf8' });
  const templateHbars = Handlebars.compile(template);
  const credential = JSON.parse(templateHbars(credentialConfig));

  if (credentialRecord.expirationDate) {
    credential.expirationDate = credentialRecord.expirationDate;
  }
  return Promise.resolve(credential);
};

export { processCredentialRequestViaOidc, processCredentialRequestViaVp };
