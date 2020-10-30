import { readFileSync } from 'fs';
import { expect } from 'chai';
import 'mocha';

import { createIssuer, getController } from './issuer';
import { Config } from './config';

const identifer = 'did:web:digitalcredentials.github.io#96K4BSIWAkhcclKssb8yTWMQSz4QzPWBy-JsAFlwoIs';
const controller = 'did:web:digitalcredentials.github.io';
const challenge = '123';
const presentationId = '456'
const credential = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://www.w3.org/2018/credentials/examples/v1"
  ],
  "id": "http://example.gov/credentials/3732",
  "type": [
    "VerifiableCredential",
    "UniversityDegreeCredential"
  ],
  "issuer": "did:web:digitalcredentials.github.io",
  "issuanceDate": "2020-03-10T04:24:12.164Z",
  "credentialSubject": {
    "id": "did:elem:ropsten:EiBJJPdo-ONF0jxqt8mZYEj9Z7FbdC87m2xvN0_HAbcoEg",
    "degree": {
      "type": "BachelorDegree",
      "name": "Bachelor of Science and Arts"
    }
  }
};
const verifiablePresentation =
{
  "@context": [
    "https://www.w3.org/2018/credentials/v1"
  ],
  "type": [
    "VerifiablePresentation"
  ],
  "id": "456",
  "holder": "did:web:digitalcredentials.github.io",
  "proof": {
    "type": "/JsonWebSignature2020",
    "http://purl.org/dc/terms/created": {
      "type": "http://www.w3.org/2001/XMLSchema#dateTime",
      "@value": "2020-10-12T17:23:38.912Z"
    },
    "https://w3id.org/security#challenge": "123",
    "https://w3id.org/security#jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..YKyqSBDjkmYEdgTuUJaylwfI9z8XjHP7eJ7W9fRoywgSIgUncWWRi6QtGYuHXth11sEpHneuIh0aPFCeqV4DBw",
    "https://w3id.org/security#proofPurpose": {
      "id": "https://w3id.org/security#authenticationMethod"
    },
    "https://w3id.org/security#verificationMethod": {
      "id": "did:web:digitalcredentials.github.io#96K4BSIWAkhcclKssb8yTWMQSz4QzPWBy-JsAFlwoIs"
    }
  }
};

const config: Config = {
  port: 5000,
  unlockedDid: JSON.parse(readFileSync("data/unlocked-did:web:digitalcredentials.github.io.json").toString("ascii"))
};
const issuer = createIssuer(config)

describe('Issuer test',
  () => {
    it('should parse controller', () => {
      const result = getController(identifer);
      expect(result).to.equal(controller);
    });

    it('should create JsonKeyKey', () => {
      const result = issuer.createJwk(identifer);
      expect(result.id).to.equal(identifer);
      expect(result.type).to.equal('JsonWebKey2020');
      expect(result.controller).to.equal(controller);
    });

    it('should sign', async () => {
      const options = {
        'verificationMethod': identifer
      };
      const result = await issuer.sign(credential, options);
      expect(result.issuer).to.equal(controller);
    }).slow(5000).timeout(10000);

    it('should verify', async () => {
      const options = {
        'verificationMethod': identifer
      };

      const temp = await issuer.sign(credential, options);
      const verificationResult = await issuer.verify(temp, options);
      console.log(JSON.stringify(verificationResult, null, 2));
      expect(verificationResult.verified).to.equal(true);
    }).slow(5000).timeout(10000);


    it('should sign presentation', async () => {
      const options = {
        'verificationMethod': identifer,
        'challenge': challenge
      };
      const result = await issuer.createAndSignPresentation(null, presentationId, controller, options);
      console.log(JSON.stringify(result, null, 2));
      expect(result.proof['https://w3id.org/security#verificationMethod']['id']).to.equal(identifer);
    }).slow(5000).timeout(10000);


    it('should verify presentation', async () => {
      const options = {
        'verificationMethod': identifer,
        'challenge': challenge
      };
      const verificationResult = await issuer.verifyPresentation(verifiablePresentation, options);
      expect(verificationResult.verified).to.equal(true);
    }).slow(5000).timeout(10000);
  });
