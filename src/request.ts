import { getDefaultIssuer } from './issuer';

const issuer = getDefaultIssuer()
const template = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://www.w3.org/2018/credentials/examples/v1"
  ],
  id: "http://example.edu/credentials/3732",
  type: ["VerifiableCredential"],
  issuer: "did:web:digitalcredentials.github.io",
  credentialSubject: {
    id: "did:example:ebfeb1f712ebc6f1c276e12ec21",
    hasAchieved: {
      type: "SuccessfulRequest",
      name: "Received a credential"
    }
  }
};


export async function requestCredential(requestInfo: any) {
  let copy = JSON.parse(JSON.stringify(template));
  copy.credentialSubject.id = requestInfo.subjectDid;

  const options = {
    verificationMethod: 'did:web:digitalcredentials.github.io#96K4BSIWAkhcclKssb8yTWMQSz4QzPWBy-JsAFlwoIs'
  };

  return issuer.sign(copy, options);
}
