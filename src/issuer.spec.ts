import { readFileSync } from 'fs';
import { expect } from 'chai';
import 'mocha';

import { createIssuer, getController } from './issuer';
import { Config } from './config';

const identifer = 'did:web:digitalcredentials.github.io#96K4BSIWAkhcclKssb8yTWMQSz4QzPWBy-JsAFlwoIs';
const controller = 'did:web:digitalcredentials.github.io';
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
  "issuer": "did:elem:ropsten:EiBJJPdo-ONF0jxqt8mZYEj9Z7FbdC87m2xvN0_HAbcoEg",
  "issuanceDate": "2020-03-10T04:24:12.164Z",
  "credentialSubject": {
    "id": "did:elem:ropsten:EiBJJPdo-ONF0jxqt8mZYEj9Z7FbdC87m2xvN0_HAbcoEg",
    "degree": {
      "type": "BachelorDegree",
      "name": "Bachelor of Science and Arts"
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
        'assertionMethod': identifer
      };
      const result = await issuer.sign(credential, options);
      expect(result.issuer).to.equal(controller);
    }).slow(5000).timeout(10000);
  });
