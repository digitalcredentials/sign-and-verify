// NOTE: The operations in this file are specific to MongoDB
// You may modify the content of credentialRequestHandler to
// suit your organization's DBMS deployment infrastructure

import { dbCredClient } from './database';

// Method for issuer to retrieve credential on behalf of learner
const credentialRequestHandler = async (holderId: string, requestId?: string): Promise<any> => {
  // NOTE: DEMO CREDENTIAL IS ONLY USED AS A PLACEHOLDER AND MAY BE DELETED ALONG WITH IMPORT
  // TODO: REPLACE WITH BUSINESS LOGIC FOR RETRIEVING CREDENTIAL FOR LEARNER
  // NOTE: HOLDER ID IS GENERATED FROM AN EXTERNAL WALLET, NOT THE ISSUER
  const CredentialModel = await dbCredClient.open();
  const credQuery = { challenge: requestId };
  const credDoc = await CredentialModel.findOne(credQuery);
  await dbCredClient.close();
  if (!credDoc) {
    return Promise.resolve({});
  }
  if (credDoc.unsigned.credentialSubject !== holderId && credDoc.unsigned.credentialSubject.id !== holderId) {
    return Promise.resolve({});
  }
  return Promise.resolve(credDoc);
};

export { credentialRequestHandler };
