// NOTE: The operations in this file are specific to MongoDB
// and the database schema used in early deployments of this code.
// You may modify the content of this file to suit your
// organization's DBMS/OIDC deployment infrastructure

import axios from 'axios';
import { Issuer } from 'openid-client';
import { dbCredClient } from './database';
import { getConfig } from './config';

export enum AuthType {
  OidcToken = 'oidc_token',
  VpChallenge = 'vp_challenge'
}

// NOTE: FEEL FREE TO ALTER IT TO CONTAIN LOGIC FOR RETRIEVING CREDENTIALS FOR LEARNERS IN YOUR ORG
// NOTE: HOLDER ID IS GENERATED FROM AN EXTERNAL WALLET, NOT THE ISSUER
// Method for issuer to retrieve credential on behalf of learner via OIDC token
export async function credentialRecordFromOidc (accessToken?: string): Promise<any> {
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
    console.log(error);
    throw new Error('Could not retrieve email from userinfo endpoint using OIDC token');
  }

  let credentialRecord;
  try {
    const CredentialModel = await dbCredClient.open();
    const credentialQuery = { [primaryKey]: email };
    credentialRecord = await CredentialModel.findOne(credentialQuery);
    await dbCredClient.close();
  } catch (error) {
    console.log(error);
    throw new Error('Could not retrieve credential for given email: ' + error);
  }
  return credentialRecord;
};

// NOTE: FEEL FREE TO ALTER IT TO CONTAIN LOGIC FOR RETRIEVING CREDENTIALS FOR LEARNERS IN YOUR ORG
// NOTE: HOLDER ID IS GENERATED FROM AN EXTERNAL WALLET, NOT THE ISSUER
// Method for issuer to retrieve credential on behalf of learner via VP challenge
export async function credentialRecordFromChallenge (challenge: string): Promise<any> {
  let credentialRecord;
  try {
    const CredentialModel = await dbCredClient.open();
    const credentialQuery = { challenge };
    credentialRecord = await CredentialModel.findOne(credentialQuery);
    await dbCredClient.close();
  } catch (error) {
    console.log(error);
    throw new Error('Could not retrieve credential for given challenge: ' + error);
  }
  return credentialRecord;
};
