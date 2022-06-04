export function composeCredential (issuerDid: string, holderDid: string, credentialRecord: any): any {
  const credential: any = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://w3id.org/security/suites/ed25519-2020/v1',
      'https://w3c-ccg.github.io/vc-ed/plugfest-1-2022/jff-vc-edu-plugfest-1-context.json'
    ],
    type: ['VerifiableCredential', 'OpenBadgeCredential'],
    issuer: {
      type: 'Profile',
      id: issuerDid,
      name: credentialRecord.issuer.name,
      // url: credentialRecord.issuer.url,
      // image: credentialRecord.issuer.image
    },
    issuanceDate: credentialRecord.issuanceDate,
    credentialSubject: {
      type: 'AchievementSubject',
      id: holderDid,
      // name: credentialRecord.credentialSubject.name,
      achievement: {
        type: 'Achievement',
        name: credentialRecord.name,
        description: credentialRecord.description,
        criteria: {
          type: 'Criteria',
          narrative: 'The first cohort of the JFF Plugfest 1 in May/June of 2022 collaborated to push interoperability of VCs in education forward.'
        },
        image: 'https://w3c-ccg.github.io/vc-ed/plugfest-1-2022/images/plugfest-1-badge-image.png'
      }
    }
  }
  if (credentialRecord.expirationDate) {
    credential.expirationDate = credentialRecord.expirationDate;
  }
  return credential;
}
