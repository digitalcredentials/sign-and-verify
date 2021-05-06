import { build } from './app'
import { expect, assert } from 'chai';
import { createSandbox } from "sinon";
import 'mocha';
import { FastifyInstance } from 'fastify';
import { Server, IncomingMessage, ServerResponse } from "http";
import { readFileSync } from 'fs';

const sandbox = createSandbox();
const unlockedDid = readFileSync("data/unlocked-did:web:digitalcredentials.github.io.json");
const validEnv = { UNLOCKED_DID: unlockedDid.toString("base64") };

const sampleUnsignedCredential = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://w3id.org/security/suites/ed25519-2020/v1"
  ],
  "id": "http://example.gov/credentials/3732",
  "type": [
    "VerifiableCredential"
  ],
  "issuer": "did:web:digitalcredentials.github.io",
  "issuanceDate": "2020-03-10T04:24:12.164Z",
  "credentialSubject": {
    "id": "did:example:abcdef"
  }
}

const sampleSignedCredential = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://w3id.org/security/suites/ed25519-2020/v1"
  ],
  "id": "http://example.gov/credentials/3732",
  "type": [
    "VerifiableCredential"
  ],
  "issuer": "did:web:digitalcredentials.github.io",
  "issuanceDate": "2020-03-10T04:24:12.164Z",
  "credentialSubject": {
    "id": "did:example:abcdef"
  },
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2021-05-04T18:59:42Z",
    "verificationMethod": "did:web:digitalcredentials.github.io#z6MkrXSQTybtqyMasfSxeRBJxDvDUGqb7mt9fFVXkVn6xTG7",
    "proofPurpose": "assertionMethod",
    "proofValue": "z4jnMia8Q1EDAQDNnurAnQgNmc1PmhrXx87j6zr9rjvrpGqSFxcHqJf55HjQPJm7Qj712KU3DXpNF1N6gYh77k9M3"
  }
}

const sampleUnsignedPresentation = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://w3id.org/security/suites/ed25519-2020/v1"
  ],
  "type": [
    "VerifiablePresentation"
  ],
  "id": "123",
  "holder": "did:key:z6MkoSu3TY7zYt7RF9LAqXbW7VegC3SFAdLp32VWudSfv8Qy"
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
  "holder": "did:key:z6MkoSu3TY7zYt7RF9LAqXbW7VegC3SFAdLp32VWudSfv8Qy",
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2021-05-01T23:38:10Z",
    "verificationMethod": "did:key:z6MkoSu3TY7zYt7RF9LAqXbW7VegC3SFAdLp32VWudSfv8Qy#z6MkoSu3TY7zYt7RF9LAqXbW7VegC3SFAdLp32VWudSfv8Qy",
    "proofPurpose": "authentication",
    "challenge": "test123",
    "proofValue": "z3Ukrcvwg59pPywog48R6xB6Fd5XWmPazqPCjdpaXpdKzaeNAc1Un1EF8VnVLbf4nvRk5SGiVDvgxddS66bi7kdAo"
  }
};

const credentialOptions = {
    "verificationMethod": "did:web:digitalcredentials.github.io#z6MkrXSQTybtqyMasfSxeRBJxDvDUGqb7mt9fFVXkVn6xTG7",
}
// same as above for credentials, but also with a 'challenge':
const presentationOptions = { ...credentialOptions, challenge: "test123" }

describe("api", () => {
    let server: FastifyInstance<Server, IncomingMessage, ServerResponse>;

    before(async () => {
        sandbox.stub(process, "env").value(validEnv);
        server = build()
        await server.ready()
    });

    describe("/status", () => {
        it("GET returns 200", async () => {
            const response = await server.inject({ method: "GET", url: "/status" });
            expect(response.statusCode).to.equal(200);
            const payload: { status: String } = JSON.parse(response.payload);
            expect(payload).to.deep.equal({ status: 'OK' });
        });
        it("POST returns 404", async () => {
            const response = await server.inject({ method: "POST", url: "/status" });
            expect(response.statusCode).to.equal(404);
            expect(response.payload).to.deep.equal('{"message":"Route POST:/status not found","error":"Not Found","statusCode":404}')
        });
    });

    describe("/issue/credentials", () => {
        const url = "/issue/credentials"
        it("POST returns 201 and cred", async () => {
            const response = await server.inject({
                method: "POST",
                url: url,
                payload: { credential: sampleUnsignedCredential, options: credentialOptions }
            });
            expect(response.statusCode).to.equal(201);
            const payload = JSON.parse(response.payload);
            expect(payload.proof.type).to.equal('Ed25519Signature2020');
            expect(payload.issuer).to.equal('did:web:digitalcredentials.github.io')
        }).timeout(6000);
    });

    describe("/prove/presentations", () => {
        const url = "/prove/presentations"
        it("POST returns 201 and presentation", async () => {
            const response = await server.inject({
                method: "POST",
                url: url,
                payload: { presentation: sampleUnsignedPresentation, options: presentationOptions }
            });
            expect(response.statusCode).to.equal(201);
            const payload = JSON.parse(response.payload);
            expect(payload.proof.type).to.equal('Ed25519Signature2020');
            expect(payload.proof.challenge).to.equal('test123')
            expect(payload.holder).to.equal('did:key:z6MkoSu3TY7zYt7RF9LAqXbW7VegC3SFAdLp32VWudSfv8Qy')
        }).timeout(6000);
    });

    describe("/verify/credentials", () => {
        const url = "/verify/credentials"
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

    describe("/request/democredential/nodidproof", () => {
        const url = "/request/democredential/nodidproof"
        it("POST returns 201 and cred", async () => {
            const response = await server.inject({
                method: "POST",
                url: url,
                payload: { "holder": "did:example:me" }
            });
            expect(response.statusCode).to.equal(201);
            const payload = JSON.parse(response.payload);
            expect(payload.proof.type).to.equal('Ed25519Signature2020');
            expect(payload.issuer.id).to.equal('did:web:digitalcredentials.github.io')
        }).timeout(6000);

        it("GET returns 404", async () => {
            const response = await server.inject({ method: "GET", url: url });
            expect(response.statusCode).to.equal(404);
            expect(response.payload).to.deep.equal('{"message":"Route GET:/request/democredential/nodidproof not found","error":"Not Found","statusCode":404}')
        });
    });

    describe("/request/democredential", () => {
        const url = "/request/democredential"
        it("POST returns 201 and cred", async () => {
            const response = await server.inject({
                method: "POST",
                url: url,
                payload: sampleSignedPresentation
            });
            expect(response.statusCode).to.equal(201);
            const payload = JSON.parse(response.payload);
            expect(payload.proof.type).to.equal('Ed25519Signature2020');
            expect(payload.issuer.id).to.equal('did:web:digitalcredentials.github.io')
        }).timeout(9000);
    });

    describe("/verify/presentations", () => {
        const url = "/verify/presentations"
        it("POST returns 200", async () => {
            const response = await server.inject({
                method: "POST",
                url: url,
                payload: { verifiablePresentation: sampleSignedPresentation, options: presentationOptions }
            });
            expect(response.statusCode).to.equal(200);
            const payload = JSON.parse(response.payload);
            expect(payload).to.deep.equal({ "holder": "did:key:z6MkoSu3TY7zYt7RF9LAqXbW7VegC3SFAdLp32VWudSfv8Qy" });
        }).timeout(9000);
    });
})



