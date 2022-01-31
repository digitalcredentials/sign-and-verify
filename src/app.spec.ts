import { build } from './app';
import { expect } from 'chai';
import { createSandbox, SinonStubbedInstance } from 'sinon';
import 'mocha';
import { FastifyInstance } from 'fastify';
import { Server, IncomingMessage, ServerResponse } from 'http';
import LRU from 'lru-cache';
import { readFileSync } from 'fs';
import { resetConfig } from './config';
import * as IssuerHelper from './issuer-helper';
import demoCredential from './demoCredential.json';

const sandbox = createSandbox();
const lruStub = sandbox.createStubInstance(LRU) as SinonStubbedInstance<LRU> & LRU;

const sampleIssuerMembershipRegistry = {
  meta: {
    created: "2020-12-02T02:32:16+0000",
    updated: "2021-09-20T01:06:23+0000"
  },
  registry: {
    "did:key:z6Mktpn6cXks1PBKLMgZH2VaahvCtBMF6K8eCa7HzrnuYLZv": {}
  }
};

lruStub.get.returns(sampleIssuerMembershipRegistry);
lruStub.set.returns(true);

const validEnv = {
  DID_SEED: 'DsnrHBHFQP0ab59dQELh3uEwy7i5ArcOTwxkwRO2hM87CBRGWBEChPO7AjmwkAZ2',
  ISSUER_MEMBERSHIP_REGISTRY_URL: "https://digitalcredentials.github.io/issuer-registry/registry.json"
};

const issuerKey = 'z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC';
const issuerId = `did:key:${issuerKey}`;
const issuerVerificationMethod = `${issuerId}#${issuerKey}`;

const holderKey = 'z6MkoSu3TY7zYt7RF9LAqXbW7VegC3SFAdLp32VWudSfv8Qy';
const holderId = `did:key:${holderKey}`;
const holderVerificationMethod = `${holderId}#${holderKey}`;

const challenge = 'test123';
const credentialOptions = { verificationMethod: issuerVerificationMethod };
// same as above for credentials, but also with a 'challenge':
const presentationOptions = { ...credentialOptions, challenge };

const sampleUnsignedCredential = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://w3id.org/security/suites/ed25519-2020/v1"
  ],
  "id": "http://example.gov/credentials/3732",
  "type": [
    "VerifiableCredential"
  ],
  "issuer": issuerId,
  "issuanceDate": "2020-03-10T04:24:12.164Z",
  "credentialSubject": {
    "id": "did:example:abcdef"
  }
};

const sampleSignedCredential = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://w3id.org/security/suites/ed25519-2020/v1"
  ],
  "id": "http://example.gov/credentials/3732",
  "type": [
    "VerifiableCredential"
  ],
  "issuer": issuerId,
  "issuanceDate": "2020-03-10T04:24:12.164Z",
  "credentialSubject": {
    "id": "did:example:abcdef"
  },
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2021-11-19T05:22:46Z",
    "verificationMethod": issuerVerificationMethod,
    "proofPurpose": "assertionMethod",
    "proofValue": "z2xonscEusWqAUJDFjdZsqtBNy4uDfzJaVvzZZgrVLMKhzLgjoj197j3AyBkL5scmR1Gq7PXJEMwSwtk5b9z2LbCV"
  }
};

const sampleUnsignedPresentation = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://w3id.org/security/suites/ed25519-2020/v1"
  ],
  "type": [
    "VerifiablePresentation"
  ],
  "id": "123",
  "holder": holderId
};

const sampleSignedPresentation = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://w3id.org/security/suites/ed25519-2020/v1"
  ],
  "type": [
    "VerifiablePresentation"
  ],
  "id": "123",
  "holder": holderId,
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2021-05-01T23:38:10Z",
    "verificationMethod": holderVerificationMethod,
    "proofPurpose": "authentication",
    "challenge": challenge,
    "proofValue": "z3Ukrcvwg59pPywog48R6xB6Fd5XWmPazqPCjdpaXpdKzaeNAc1Un1EF8VnVLbf4nvRk5SGiVDvgxddS66bi7kdAo"
  }
};

describe("api", () => {
  let server: FastifyInstance<Server, IncomingMessage, ServerResponse>;

  before(async () => {
    resetConfig();
    sandbox.stub(process, "env").value(validEnv);
    server = await build();
    await server.ready();
  });

  describe("/status", () => {
    const url = "/status";
    it("GET returns 200", async () => {
      const response = await server.inject({ method: "GET", url: url });
      expect(response.statusCode).to.equal(200);
      const payload: { status: String } = JSON.parse(response.payload);
      expect(payload).to.deep.equal({ status: 'OK' });
    });

    it("POST returns 404", async () => {
      const response = await server.inject({ method: "POST", url: url });
      expect(response.statusCode).to.equal(404);
      expect(response.payload).to.deep.equal('{"message":"Route POST:/status not found","error":"Not Found","statusCode":404}');
    });
  });

  describe("/issue/credentials", () => {
    const url = "/issue/credentials";
    it("POST returns 201 and cred", async () => {
      const response = await server.inject({
        method: "POST",
        url: url,
        payload: { credential: sampleUnsignedCredential, options: credentialOptions }
      });
      expect(response.statusCode).to.equal(201);
      const payload = JSON.parse(response.payload);
      expect(payload.proof.type).to.equal('Ed25519Signature2020');
      expect(payload.issuer).to.equal(issuerId);
    }).timeout(6000);
  });

  describe("/prove/presentations", () => {
    const url = "/prove/presentations";
    it("POST returns 201 and presentation", async () => {
      const response = await server.inject({
        method: "POST",
        url: url,
        payload: { presentation: sampleUnsignedPresentation, options: presentationOptions }
      });
      expect(response.statusCode).to.equal(201);
      const payload = JSON.parse(response.payload);
      expect(payload.proof.type).to.equal('Ed25519Signature2020');
      expect(payload.proof.challenge).to.equal(challenge);
      expect(payload.holder).to.equal(holderId);
    }).timeout(6000);
  });

  describe("/verify/credentials", () => {
    const url = "/verify/credentials";
    it("POST returns 200", async () => {
      const response = await server.inject({
        method: "POST",
        url: url,
        payload: { verifiableCredential: sampleSignedCredential, options: credentialOptions }
      });
      expect(response.statusCode).to.equal(200);
      const payload = JSON.parse(response.payload);
      expect(payload.results[0].proof.type).to.equal('Ed25519Signature2020');
      expect(payload.verified).to.be.true;
    }).timeout(6000);
  });

  describe("/verify/presentations", () => {
    const url = "/verify/presentations";
    it("POST returns 200", async () => {
      const response = await server.inject({
        method: "POST",
        url: url,
        payload: { verifiablePresentation: sampleSignedPresentation, options: presentationOptions }
      });
      expect(response.statusCode).to.equal(200);
      const payload = JSON.parse(response.payload);
      expect(payload.verified).to.be.true;
    }).timeout(9000);
  });

  describe("/request/credential", () => {
    sandbox.stub(IssuerHelper, 'credentialRequestHandler').returns(Promise.resolve(demoCredential));
    const url = "/request/credential";
    it("POST returns 201", async () => {
      const response = await server.inject({
        method: "POST",
        url: url,
        headers: {
          authorization: 'Bearer ey012abc.345ghi.678xyz'
        },
        payload: { verifiablePresentation: sampleSignedPresentation, options: presentationOptions }
      });
      expect(response.statusCode).to.equal(201);
      const payload = JSON.parse(response.payload);
      expect(payload.proof.type).to.equal('Ed25519Signature2020');
      expect(payload.issuer.id).to.equal(issuerId);
    }).timeout(9000);
  });

  describe("/request/democredential/nodidproof", () => {
    const url = "/request/democredential/nodidproof";
    it("POST returns 500 if demo issuance not supported", async () => {
      const response = await server.inject({
        method: "POST",
        url: url,
        payload: { "holder": "did:example:me" }
      });
      expect(response.statusCode).to.equal(500);
     }).timeout(6000);

    it("GET returns 404", async () => {
      const response = await server.inject({ method: "GET", url: url });
      expect(response.statusCode).to.equal(404);
      expect(response.payload).to.deep.equal('{"message":"Route GET:/request/democredential/nodidproof not found","error":"Not Found","statusCode":404}');
    });
  });

  describe("/request/democredential", () => {
    const url = "/request/democredential";
    it("POST returns 500 if demo issuance not supported", async () => {
      const response = await server.inject({
        method: "POST",
        url: url,
        payload: sampleSignedPresentation
      });
      expect(response.statusCode).to.equal(500);
    }).timeout(9000);
  });

  describe("/generate/controlproof", () => {
    const url = "/generate/controlproof";
    it("POST returns 201 and cred", async () => {
        const response = await server.inject({
            method: "POST",
            url: url,
            payload: { 
              "presentationId": "456", 
              "holder": issuerId, 
              "verificationMethod": issuerVerificationMethod, 
              "challenge": "123" 
            }
        });
        expect(response.statusCode).to.equal(201);
        const payload = JSON.parse(response.payload);
        expect(payload.holder).to.equal(issuerId);
    }).timeout(6000);
  });
});

describe("api with demo issuance", () => {
  let server: FastifyInstance<Server, IncomingMessage, ServerResponse>;

  before(async () => {
    resetConfig();
    sandbox.stub(process, "env").value(
      {
        ...validEnv,
        DEMO_ISSUER_METHOD: issuerVerificationMethod
      }
    );
    server = await build();
    await server.ready();
  });

  describe("/request/democredential/nodidproof", () => {
    const url = "/request/democredential/nodidproof";
    it("POST returns 201 and credential", async () => {
      const response = await server.inject({
        method: "POST",
        url: url,
        payload: { "holder": "did:example:me" }
      });
      expect(response.statusCode).to.equal(201);
      const payload = JSON.parse(response.payload);
      expect(payload.proof.type).to.equal('Ed25519Signature2020');
      expect(payload.issuer.id).to.equal(issuerId);
      expect(payload.credentialSubject.id).to.equal("did:example:me");
    }).timeout(6000);

    it("GET returns 404", async () => {
      const response = await server.inject({ method: "GET", url: url });
      expect(response.statusCode).to.equal(404);
      expect(response.payload).to.deep.equal('{"message":"Route GET:/request/democredential/nodidproof not found","error":"Not Found","statusCode":404}');
    });
  });

  describe("/request/democredential", () => {
    const url = "/request/democredential";
    it("POST returns 201 and credential", async () => {
      const response = await server.inject({
        method: "POST",
        url: url,
        payload: sampleSignedPresentation
      });
      expect(response.statusCode).to.equal(201);
      const payload = JSON.parse(response.payload);
      expect(payload.proof.type).to.equal('Ed25519Signature2020');
      expect(payload.issuer.id).to.equal(issuerId);
    }).timeout(9000);
  });
});
