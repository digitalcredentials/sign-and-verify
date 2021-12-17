// NOTE: The operations in this file are specific to MongoDB
// You may modify the content of credentialRequestHandler to
// suit your organization's DBMS deployment infrastructure

import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import { dbCredClient } from './database';
import { default as issuerConfig } from './issuer-config.json';

// Method for issuer to retrieve credential on behalf of learner
const credentialRequestHandler = async (holderId: string, credentialId: string): Promise<any> => {
  // NOTE: DEMO CREDENTIAL IS ONLY USED AS A PLACEHOLDER AND MAY BE DELETED ALONG WITH IMPORT
  // TODO: REPLACE WITH BUSINESS LOGIC FOR RETRIEVING CREDENTIAL FOR LEARNER
  // NOTE: HOLDER ID IS GENERATED FROM AN EXTERNAL WALLET, NOT THE ISSUER
  const CredentialModel = await dbCredClient.open();
  const credQuery = { [credentialId]: { '$exists': 1 } };
  const learnerRecord = await CredentialModel.findOne(credQuery);
  await dbCredClient.close();
  if (!learnerRecord) {
    return Promise.resolve({});
  }

  // Populate remainder of credential config
  const credentialConfig = {
    ...issuerConfig,
    CREDENTIAL_ID: credentialId,
    LEARNER_DID: holderId,
    LEARNER_NAME: learnerRecord.learnerName,
    DEGREE: learnerRecord.degree,
    MAJOR: learnerRecord.major
  };

  // Select desired credential template, as specified by institution in learner record
  const template = fs.readFileSync(path.resolve(__dirname, `./templates/${learnerRecord['credTypes'][credentialId]}.json`));
  const templateHbars = Handlebars.compile(template);
  const credential = JSON.parse(templateHbars(credentialConfig));
  return Promise.resolve(credential);
};

export { credentialRequestHandler };
