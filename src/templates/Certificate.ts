import { randomUUID } from "crypto";

export function composeCredential (issuerDid: string, holderDid: string, credentialRecord: any): any {
  try {
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
    name: credentialRecord.credentialName,
    issuer: {
      type: "Profile",
      id: issuerDid,
      name: credentialRecord.issuerName,
      url: credentialRecord.issuerURI,
      image: {
          id: credentialRecord.issuerImage,
          type: "Image"
        }
    },
    issuanceDate: credentialRecord.issuanceDate,
    credentialSubject: {
      type: ["AchievementSubject"],
      id: holderDid,
      name: credentialRecord.studentName,
      achievement: {
        id: `urn:uuid:${randomUUID()}`,
        type: [
          "Achievement"
        ],
        name: credentialRecord.credentialName,
        description: credentialRecord.credentialDescription
      }
    }
  }

  if (credentialRecord.expirationDate) {
    credential.expirationDate = credentialRecord.expirationDate;
  }

  if (credentialRecord.credentialImage) {
    credential.credentialSubject.achievement.image = {
      id: credentialRecord.credentialImage,
      type: "Image"
    }
  }

  if (credentialRecord.credentialCriteria) {
    credential.credentialSubject.achievement.criteria = {
     narrative: credentialRecord.credentialCriteria
    }
  }
  return credential;
} catch (e) {
  console.log(e)
}
}

