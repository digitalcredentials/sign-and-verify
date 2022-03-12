// NOTE: The operations in this file are specific to MongoDB
// and the database schema used in early deployments of this code.
// You may modify the content of credentialRequestHandler to
// suit your organization's DBMS deployment infrastructure

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import Handlebars from 'handlebars';
import { Issuer } from 'openid-client';
import { dbCredClient } from './database';
import { getConfig } from './config';

// NOTE: FEEL FREE TO ALTER IT TO CONTAIN LOGIC FOR RETRIEVING CREDENTIALS FOR LEARNERS IN YOUR ORG
// NOTE: HOLDER ID IS GENERATED FROM AN EXTERNAL WALLET, NOT THE ISSUER
// Method for issuer to retrieve credential on behalf of learner
const credentialRequestHandler = async (issuerId: string, holderId: string, accessToken: string): Promise<any> => {
  // NOTE: using one credential type for now
  // Select credential type
  const credentialType = 'Certificate';
  // NOTE: CREDENTIAL ID IS THE LEARNER EMAIL IN EARLY DEPLOYMENTS OF THIS CODE
  // Select credential primary key
  const primaryKey = 'credentialSubject.email';
  // Extract email from ID token
  const { oidcIssuerUrl } = getConfig();
  const oidcIssuer = await Issuer.discover(oidcIssuerUrl as string);
  const userinfoEndpoint = oidcIssuer.metadata.userinfo_endpoint as string;
  const userinfo = (await axios.get(userinfoEndpoint, { headers: { 'Authorization': `Bearer ${accessToken}` } })).data;
  const email = userinfo.email;
  if (!email) {
    throw new Error('ID token does not contain email');
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
    ...(credentialRecord.expirationDate ? { EXPIRATION_DATE: credentialRecord.expirationDate } : null),
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

export { credentialRequestHandler };
