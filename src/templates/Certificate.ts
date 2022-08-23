import { v4 as uuidv4 } from 'uuid';

export function composeCredential (issuerDid: string, holderDid: string, credentialRecord: any): any {
  const credential: any = {
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
  if (credentialRecord.expirationDate) {
    credential.expirationDate = credentialRecord.expirationDate;
  }
  return credential;
}
