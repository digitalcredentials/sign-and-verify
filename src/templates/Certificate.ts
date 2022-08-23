import { v4 as uuidv4 } from 'uuid';
import { Credential } from '../types';

export function composeCredential (issuerDid: string, holderDid: string, credentialRecord: any): Credential {
  const credential: Credential = {
    id: uuidv4(),
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://w3id.org/security/suites/ed25519-2020/v1',
      'https://w3id.org/dcc/v1'
    ],
    type: ['VerifiableCredential', 'Assertion'],
    issuer: {
      id: issuerDid,
      name: credentialRecord.issuer.name,
      url: credentialRecord.issuer.url,
      image: credentialRecord.issuer.image
    },
    issuanceDate: credentialRecord.issuanceDate,
    ...(credentialRecord.expirationDate && {expirationDate: credentialRecord.expirationDate}),
    credentialSubject: {
      id: holderDid,
      name: credentialRecord.credentialSubject.name,
      hasCredential: {
        type: ['EducationalOccupationalCredential'],
        name: credentialRecord.name,
        description: credentialRecord.description
      }
    }
  }
  return credential;
}
