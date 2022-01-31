// NOTE: The operations in this file are specific to MongoDB
// You may modify the content of credentialRequestHandler to
// suit your organization's DBMS deployment infrastructure

import fs from 'fs';
import path from 'path';
import jwt_decode from "jwt-decode";
import Handlebars from 'handlebars';
import { dbCredClient } from './database';
import { default as issuerConfig } from './issuer-config.json';

// NOTE: FEEL FREE TO ALTER IT TO CONTAIN LOGIC FOR RETRIEVING CREDENTIALS FOR LEARNERS IN YOUR ORG
// NOTE: HOLDER ID IS GENERATED FROM AN EXTERNAL WALLET, NOT THE ISSUER
// Method for issuer to retrieve credential on behalf of learner
const credentialRequestHandler = async (holderId: string, idToken: string): Promise<any> => {
  // NOTE: using one credential type for now
  // Select credential type
  const credentialType = 'Certificate';
  // NOTE: CREDENTIAL ID IS THE LEARNER EMAIL IN EARLY DEPLOYMENTS OF THIS CODE
  // Select credential primary key
  const primaryKey = 'credentialSubject.email';
  // Extract email from ID token
  const idObject: any = jwt_decode(idToken);
  const email = idObject.email;
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
    ...issuerConfig,
    CREDENTIAL_NAME: credentialRecord.name,
    CREDENTIAL_DESC: credentialRecord.description,
    ISSUANCE_DATE: credentialRecord.issuanceDate,
    ISSUER_NAME: credentialRecord.issuer.name,
    ISSUER_URL: credentialRecord.issuer.url,
    ISSUER_IMAGE: credentialRecord.issuer.image,
    LEARNER_NAME: credentialRecord.credentialSubject.name,
    LEARNER_DID: holderId
  };

  // Select desired credential template
  const templateFileName = path.resolve(__dirname, `./templates/${credentialType}.json`);
  const template = fs.readFileSync(templateFileName, { encoding:'utf8' });
  const templateHbars = Handlebars.compile(template);
  const credential = JSON.parse(templateHbars(credentialConfig));
  return Promise.resolve(credential);
};

export { credentialRequestHandler };
