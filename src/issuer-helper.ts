// NOTE: The operations in this file are specific to MongoDB
// You may modify the content of credentialRequestHandler to
// suit your organization's DBMS deployment infrastructure

import fs from 'fs';
import path from 'path';
import { get, keys, reduce } from 'lodash';
import Handlebars from 'handlebars';
import { dbCredClient } from './database';
import { default as issuerConfig } from './issuer-config.json';

// NOTE: THIS FUNCTION WAS DESIGNED TO BE AS GENERAL AS POSSIBLE, BUT FEEL FREE TO
// ALTER IT TO CONTAIN LOGIC FOR RETRIEVING CREDENTIALS FOR LEARNERS IN YOUR ORG
// NOTE: HOLDER ID IS GENERATED FROM AN EXTERNAL WALLET, NOT THE ISSUER
// Method for issuer to retrieve credential on behalf of learner
const credentialRequestHandler = async (holderId: string, credentialId: string): Promise<any> => {
  // TODO: need to find a way to receive credential type from request payload
  // Select desired credential schema
  const credentialType = 'Certificate';
  const schemaFileName = path.resolve(__dirname, `./schema/${credentialType}.json`);
  const schemaFileString = fs.readFileSync(schemaFileName, { encoding:'utf8' });
  const schemaObj = JSON.parse(schemaFileString);
  const primaryKey = schemaObj.id;
  const schema = schemaObj.schema;

  const CredentialModel = await dbCredClient.open();
  const credentialQuery = { [primaryKey]: credentialId };
  const credentialRecord = await CredentialModel.findOne(credentialQuery);
  await dbCredClient.close();
  if (!credentialRecord) {
    return Promise.resolve({});
  }

  // Populate remainder of credential config
  const templateTokens = keys(schema);
  const learnerCredentialConfig = reduce(
    templateTokens,
    (config, token) => {
      const value = get(credentialRecord, schema[token]);
      config[token] = value;
      return config;
    },
    {}
  );
  const credentialConfig = {
    ...issuerConfig,
    ...learnerCredentialConfig,
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
