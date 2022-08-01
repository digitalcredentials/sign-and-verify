import axios from 'axios';
import mockfs from 'mock-fs';
import { expect } from 'chai';
import { createSandbox, SinonStubbedInstance, SinonSpy } from 'sinon';
import 'mocha';
import { FastifyInstance } from 'fastify';
import { Server, IncomingMessage, ServerResponse } from 'http';
import LRU from 'lru-cache';
import { Collection } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Issuer } from 'openid-client';
import { build } from '../app';
import { resetConfig } from '../config';
import { VisibilityLevel } from '../credential-status';
import * as Database from '../database';
import demoCredential from '../demoCredential.json';
import * as IssuerHelper from '../issuer';
import * as Certificate from '../templates/Certificate';
import { dbCreate, dbConnect, dbDisconnect, Credential } from './database';

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

const authType = IssuerHelper.AuthType.OidcToken;
const didSeed = "DsnrHBHFQP0ab59dQELh3uEwy7i5ArcOTwxkwRO2hM87CBRGWBEChPO7AjmwkAZ2";
const didWebUrl = "https://vc-issuer.example.com";
const vcApiIssuerUrl = "https://vc-issuer.example.com";
const oidcIssuerUrl = "https://oidc-issuer.example.com";
const issuerMembershipRegistryUrl = "https://digitalcredentials.github.io/issuer-registry/registry.json";
const credStatusRepoName = "credential-status";
const credStatusRepoOwner = "university-xyz";
const credStatusRepoVisibility = VisibilityLevel.Public;
const githubOauthToken = "abc";
const validEnv = {
  AUTH_TYPE: authType,
  DID_SEED: didSeed,
  DID_WEB_URL: didWebUrl,
  URL: vcApiIssuerUrl,
  OIDC_ISSUER_URL: oidcIssuerUrl,
  ISSUER_MEMBERSHIP_REGISTRY_URL: issuerMembershipRegistryUrl,
  CRED_STATUS_REPO_NAME: credStatusRepoName,
  CRED_STATUS_REPO_OWNER: credStatusRepoOwner,
  CRED_STATUS_REPO_VISIBILITY: credStatusRepoVisibility,
  GITHUB_OAUTH_TOKEN: githubOauthToken
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

const issuerUrl1 = "https://cs.example1.edu";
const email1 = "learner-one@example1.edu";
const sampleDbCredential1 = {
  "name": "Sample Course Level 1",
  "description": "This is an intro course offered by Example Institute of Technology.",
  "issuer": {
    "name": "Example Institute of Technology",
    "url": issuerUrl1,
    "image": `${issuerUrl1}/logo.png`
  },
  "credentialSubject": {
    "name": "Learner One",
    "email": email1
  },
  "issuanceDate": "2020-08-16T12:00:00.000+00:00",
  "expirationDate": "2025-08-16T12:00:00.000+00:00",
  "challenge": challenge
};

const issuerUrl2 = "https://cs.example2.edu";
const email2 = "learner-two@example2.edu";
const sampleDbCredential2 = {
  "name": "Sample Course Level 2",
  "description": "This is an advanced course offered by Example Institute of Technology.",
  "issuer": {
    "name": "Example Institute of Technology",
    "url": issuerUrl2,
    "image": `${issuerUrl2}/logo.png`
  },
  "credentialSubject": {
    "name": "Learner Two",
    "email": email2
  },
  "issuanceDate": "2017-06-12T12:00:00.000+00:00",
  "expirationDate": "2022-06-12T12:00:00.000+00:00",
  "challenge": challenge
};

const validateNotEmpty = (received) => {
  expect(received).not.to.be.null;
  expect(received).not.to.equal(undefined);
};

const validateObjectEquality = (received, expected) => {
  for (const key in expected) {
    expect(received[key]).to.eql(expected[key]);
  }
};

describe("api", () => {
  let apiServer: FastifyInstance<Server, IncomingMessage, ServerResponse>;

  before(async () => {
    resetConfig();
    apiServer = await build();
    await apiServer.ready();
  });

  after(async () => {
    sandbox.restore();
  });

  describe("/status", () => {
    const url = "/status";
    it("GET returns 200", async () => {
      const response = await apiServer.inject({ method: "GET", url: url });
      expect(response.statusCode).to.equal(200);
      const payload: { status: String } = JSON.parse(response.payload);
      expect(payload).to.deep.equal({ status: 'OK' });
    });

    it("POST returns 404", async () => {
      const response = await apiServer.inject({ method: "POST", url: url });
      expect(response.statusCode).to.equal(404);
      expect(response.payload).to.deep.equal('{"message":"Route POST:/status not found","error":"Not Found","statusCode":404}');
    });
  });

  describe("/issue/credentials", () => {
    const url = "/issue/credentials";
    it("POST returns 201 and cred", async () => {
      const response = await apiServer.inject({
        method: "POST",
        url: url,
        payload: { credential: sampleUnsignedCredential, options: credentialOptions }
      });

      const payload = JSON.parse(response.payload);
      expect(response.statusCode).to.equal(201);
      expect(payload.proof.type).to.equal('Ed25519Signature2020');
      expect(payload.issuer).to.equal(issuerId);

      mockfs.restore();
    }).timeout(6000);
  });

  describe("/prove/presentations", () => {
    const url = "/prove/presentations";
    it("POST returns 201 and presentation", async () => {
      const response = await apiServer.inject({
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
      const response = await apiServer.inject({
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
      const response = await apiServer.inject({
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
    sandbox.stub(IssuerHelper, 'credentialRecordFromOidc').returns(Promise.resolve({}));
    sandbox.stub(Certificate, 'composeCredential').returns(demoCredential);
    const url = "/request/credential";
    it("POST returns 201", async () => {
      const response = await apiServer.inject({
        method: "POST",
        url: url,
        headers: {
          authorization: "Bearer @cc3$$t0k3n123"
        },
        payload: sampleSignedPresentation
      });

      const payload = JSON.parse(response.payload);
      expect(response.statusCode).to.equal(200);
      expect(payload.proof.type).to.equal('Ed25519Signature2020');
      expect(payload.issuer.id).to.equal(issuerId);

      mockfs.restore();
    }).timeout(9000);
  });

  describe("/request/democredential/nodidproof", () => {
    const url = "/request/democredential/nodidproof";
    it("POST returns 500 if demo issuance not supported", async () => {
      const response = await apiServer.inject({
        method: "POST",
        url: url,
        payload: { "holder": "did:example:me" }
      });
      expect(response.statusCode).to.equal(500);
     }).timeout(6000);

    it("GET returns 404", async () => {
      const response = await apiServer.inject({ method: "GET", url: url });
      expect(response.statusCode).to.equal(404);
      expect(response.payload).to.deep.equal('{"message":"Route GET:/request/democredential/nodidproof not found","error":"Not Found","statusCode":404}');
    });
  });

  describe("/request/democredential", () => {
    const url = "/request/democredential";
    it("POST returns 500 if demo issuance not supported", async () => {
      const response = await apiServer.inject({
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
      const response = await apiServer.inject({
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
  let apiServer: FastifyInstance<Server, IncomingMessage, ServerResponse>;

  before(async () => {
    resetConfig();
    sandbox.stub(process, "env").value(
      {
        ...validEnv,
        DEMO_ISSUER_METHOD: issuerVerificationMethod
      }
    );
    apiServer = await build();
    await apiServer.ready();
  });

  after(async () => {
    sandbox.restore();
  });

  describe("/request/democredential/nodidproof", () => {
    const url = "/request/democredential/nodidproof";
    it("POST returns 201 and credential", async () => {
      const response = await apiServer.inject({
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
      const response = await apiServer.inject({ method: "GET", url: url });
      expect(response.statusCode).to.equal(404);
      expect(response.payload).to.deep.equal('{"message":"Route GET:/request/democredential/nodidproof not found","error":"Not Found","statusCode":404}');
    });
  });

  describe("/request/democredential", () => {
    const url = "/request/democredential";
    it("POST returns 201 and credential", async () => {
      const response = await apiServer.inject({
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

describe("api with db inspection", () => {
  let dbServer: MongoMemoryServer;
  const dbName = "test";
  const dbCollection = "credentials";
  let findOneSpy: SinonSpy;

  before(async () => {
    dbServer = await dbCreate({ instance: { dbName } });
    const dbUri = dbServer.getUri();
    sandbox.stub(Database, "dbCredClient").value(
      new Database.DatabaseClient(dbUri, dbName, dbCollection)
    );
    await dbConnect(dbUri);
  });

  after(async () => {
    await dbDisconnect(dbServer);
  });

  describe("/request/credential - vp_challenge auth type", () => {
    let apiServer: FastifyInstance<Server, IncomingMessage, ServerResponse>;

    beforeEach(async () => {
      findOneSpy = sandbox.spy(Collection.prototype, "findOne");
      resetConfig();
      const vpChallengeEnv = {
        ...validEnv,
        AUTH_TYPE: IssuerHelper.AuthType.VpChallenge
      };
      sandbox.stub(process, "env").value(vpChallengeEnv);
      apiServer = await build();
      await apiServer.ready();
    });

    afterEach(async () => {
      findOneSpy.restore();
    });

    const url = "/request/credential";
    it("returns proper credential db record", async () => {
      const validCredentialRecord = new Credential(sampleDbCredential1);
      const savedCredentialRecord = await validCredentialRecord.save();
      validateNotEmpty(savedCredentialRecord);
      await apiServer.inject({
        method: "POST",
        url: url,
        payload: sampleSignedPresentation
      });
      expect(findOneSpy.calledOnceWith({ challenge })).to.be.true;
      validateObjectEquality(await findOneSpy.firstCall.returnValue, sampleDbCredential1);
    }).timeout(10000);
  });

  describe("/request/credential - oidc_token auth type", () => {
    let apiServer: FastifyInstance<Server, IncomingMessage, ServerResponse>;

    beforeEach(async () => {
      findOneSpy = sandbox.spy(Collection.prototype, "findOne");
      resetConfig();
      const oidcTokenEnv = {
        ...validEnv,
        AUTH_TYPE: IssuerHelper.AuthType.OidcToken
      };
      sandbox.stub(process, "env").value(oidcTokenEnv);
      apiServer = await build();
      await apiServer.ready();
    });

    afterEach(async () => {
      findOneSpy.restore();
    });

    const url = "/request/credential";
    it("returns proper credential db record", async () => {
      const userinfoEndpoint = `${issuerUrl2}/userinfo`;
      const bearerToken = "Bearer @cc3$$t0k3n123";
      sandbox.stub(Issuer, "discover").resolves(new Issuer({ issuer: issuerUrl2, userinfo_endpoint: userinfoEndpoint }));
      sandbox.stub(axios, "get").withArgs(userinfoEndpoint).resolves({ data: { email: email2 } });
      const validCredentialRecord = new Credential(sampleDbCredential2);
      const savedCredentialRecord = await validCredentialRecord.save();
      validateNotEmpty(savedCredentialRecord);
      await apiServer.inject({
        method: "POST",
        url: url,
        headers: {
          authorization: bearerToken
        },
        payload: sampleSignedPresentation
      });
      expect(findOneSpy.calledOnceWith({ "credentialSubject.email": email2 })).to.be.true;
      validateObjectEquality(await findOneSpy.firstCall.returnValue, sampleDbCredential2);
    }).timeout(10000);
  });
});
