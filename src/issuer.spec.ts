import { readFileSync } from 'fs';
import { expect } from 'chai';
import 'mocha';

import { createIssuer, getController } from './issuer';
import { getProofProperty } from './signatures';
import { Config } from './config';

const identifer = 'did:web:digitalcredentials.github.io#96K4BSIWAkhcclKssb8yTWMQSz4QzPWBy-JsAFlwoIs';
const controller = 'did:web:digitalcredentials.github.io';
const challenge = '123';
const presentationId = '456'
const credential = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://www.w3.org/2018/credentials/examples/v1",
    "https://w3c-ccg.github.io/lds-jws2020/contexts/lds-jws2020-v1.json",
  ],
  "id": "http://example.gov/credentials/3732",
  "type": [
    "VerifiableCredential",
    "UniversityDegreeCredential"
  ],
  "issuer": "did:web:digitalcredentials.github.io",
  "issuanceDate": "2020-03-10T04:24:12.164Z",
  "credentialSubject": {
    "id": "did:example:abcdef",
    "degree": {
      "type": "BachelorDegree",
      "name": "Bachelor of Science and Arts"
    }
  }
};

const verifiablePresentation = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://www.w3.org/2018/credentials/examples/v1",
    "https://w3c-ccg.github.io/lds-jws2020/contexts/lds-jws2020-v1.json"
  ],
  "type": [
    "VerifiablePresentation"
  ],
  "id": "456",
  "holder": "did:web:digitalcredentials.github.io",
  "proof": {
    "type": "JsonWebSignature2020",
    "created": "2020-11-12T22:00:33.393Z",
    "challenge": "123",
    "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..nuQE1vdLcf0YJSI_ojCdOpkQ53Amf4admAfA1eds9ONz9iskp5NBHqoz_YpzyRPxRvj4zblDDAhR524Dn4BtBA",
    "proofPurpose": "authentication",
    "verificationMethod": "did:web:digitalcredentials.github.io#96K4BSIWAkhcclKssb8yTWMQSz4QzPWBy-JsAFlwoIs"
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
      expect(verificationResult.verified).to.equal(true);
    }).slow(5000).timeout(10000);


    it('should sign presentation', async () => {
      const options = {
        'verificationMethod': identifer,
        'challenge': challenge
      };
      const result: any = await issuer.createAndSignPresentation(null, presentationId, controller, options);
      const vmResult = getProofProperty(result.proof, 'verificationMethod');
      expect(vmResult).to.equal(identifer);
    }).slow(5000).timeout(10000);


    it('should verify presentation', async () => {
      const options = {
        'verificationMethod': identifer,
        'challenge': challenge
      };
      const verificationResult = await issuer.verifyPresentation(verifiablePresentation, options);
      expect(verificationResult.verified).to.equal(true);
    }).slow(5000).timeout(10000);

    it("should get demo credential", async () => {
      const options = {
        'verificationMethod': identifer,
        'challenge': challenge
      };
      const credential = await issuer.requestDemoCredential(verifiablePresentation);
      expect(credential.credentialSubject.id).to.equal("did:web:digitalcredentials.github.io");
    }).slow(5000).timeout(10000);

    it("should get demo credential without verification", async () => {
      const request = {
        holder: "did:example:me"
      };

      const credential = await issuer.requestDemoCredential(request, true);
      expect(credential.credentialSubject.id).to.equal("did:example:me");
    }).slow(5000).timeout(10000);

  });
