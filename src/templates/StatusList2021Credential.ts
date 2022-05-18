const { createList, createCredential } = require('@digitalbazaar/vc-status-list');

export const composeStatusCredential = async (issuerDid: string, credentialId: string): Promise<any> => {
  const credentialList = await createList({length: 100000});
  const issuanceDate = (new Date()).toISOString();
  let credential = await createCredential({ id: credentialId, list: credentialList });
  credential = {
    ...credential,
    issuer: issuerDid,
    issuanceDate
  };
  return credential;
}
