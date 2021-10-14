import demoCredential from "./demoCredential.json";

// Method for issuer to retrieve credential on behalf of learner
const credentialRequestHandler = (holderId: string, requestId?: string): any => {
  // NOTE: DEMO CREDENTIAL IS ONLY USED AS A PLACEHOLDER AND MAY BE DELETED ALONG WITH IMPORT
  // TODO: REPLACE WITH BUSINESS LOGIC FOR RETRIEVING CREDENTIAL FOR LEARNER
  // NOTE: HOLDER ID IS GENERATED FROM AN EXTERNAL WALLET, NOT THE ISSUER
  return demoCredential;
};

export { credentialRequestHandler };
