import { randomUUID } from "crypto";

export function composeCredential (issuerDid: string, holderDid: string, credentialRecord: any): any {
  
  const credential: any = {
    '@context': [
      "https://www.w3.org/2018/credentials/v1",
      "https://purl.imsglobal.org/spec/ob/v3p0/context.json"
    ],
    id: `urn:uuid:${randomUUID()}`,
    type: [
      "VerifiableCredential",
      "OpenBadgeCredential"
    ],
    name: credentialRecord.name,
    issuer: {
      type: "Profile",
      id: issuerDid,
      name: credentialRecord.issuer.name,
      url: credentialRecord.issuer.url,
      image: {
          id: credentialRecord.issuer.image,
          type: "Image"
        }
    },
    issuanceDate: credentialRecord.issuanceDate,
    credentialSubject: {
      type: ["AchievementSubject"],
      id: holderDid,
      name: credentialRecord.credentialSubject.name,
      achievement: {
        id: `urn:uuid:${randomUUID()}`,
        type: [
          "Achievement"
        ],
        name: credentialRecord.name,
        description: credentialRecord.description
      }
    }
  }

  if (credentialRecord.expirationDate) {
    credential.expirationDate = credentialRecord.expirationDate;
  }

  if (credentialRecord.credentialSubject?.achievement?.image) {
    credential.credentialSubject.achievement.image = {
      id: credentialRecord.credentialSubject.achievement.image,
      type: "Image"
    }
  }

  if (credentialRecord.credentialSubject?.achievement?.criteria?.narrative) {
    credential.credentialSubject.achievement.criteria = {
     narrative: credentialRecord.credentialSubject.achievement.criteria.narrative
    }
  }
  return credential;
}

