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
        "https://www.w3.org/2018/credentials/examples/v1",
        "https://w3c-ccg.github.io/lds-jws2020/contexts/lds-jws2020-v1.json"
    ],
    "id": "http://example.gov/credentials/3732",
    "type": ["VerifiableCredential", "UniversityDegreeCredential"],
    "issuer": "did:web:digitalcredentials.github.io",
    "issuanceDate": "2020-03-10T04:24:12.164Z",
    "credentialSubject": {
        "id": "did:example:abcdef",
        "degree": {
            "type": "BachelorDegree",
            "name": "Bachelor of Science and Arts"
        }
    }
}

const sampleSignedCredential = {
    '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/2018/credentials/examples/v1',
        'https://w3c-ccg.github.io/lds-jws2020/contexts/lds-jws2020-v1.json'
    ],
    id: 'http://example.gov/credentials/3732',
    type: ['VerifiableCredential', 'UniversityDegreeCredential'],
    issuer: 'did:web:digitalcredentials.github.io',
    issuanceDate: '2020-03-10T04:24:12.164Z',
    credentialSubject: {
        id: 'did:example:abcdef',
        degree: { type: 'BachelorDegree', name: 'Bachelor of Science and Arts' }
    },
    proof: {
        type: 'JsonWebSignature2020',
        created: '2020-12-15T22:45:18.623Z',
        jws: 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..1YXA13VGtZKJZrDVlPXYpQfCAxits3NEVlDGHg-59rUW4w66rXrk1yqoMVDLrhGdk8-IpY24HcvPdOLPOo1OBw',
        proofPurpose: 'assertionMethod',
        verificationMethod: 'did:web:digitalcredentials.github.io#96K4BSIWAkhcclKssb8yTWMQSz4QzPWBy-JsAFlwoIs'
    }
}

const sampleUnsignedPresentation = {
    '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/2018/credentials/examples/v1',
        'https://w3c-ccg.github.io/lds-jws2020/contexts/lds-jws2020-v1.json'
    ],
    type: ['VerifiablePresentation'],
    id: '456',
    holder: 'did:web:digitalcredentials.github.io'
}


const sampleSignedPresentation = {
    "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://www.w3.org/2018/credentials/examples/v1",
        "https://w3c-ccg.github.io/lds-jws2020/contexts/lds-jws2020-v1.json"
    ],
    "type": ["VerifiablePresentation"],
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
}

const credentialOptions = {
    "verificationMethod": "did:web:digitalcredentials.github.io#96K4BSIWAkhcclKssb8yTWMQSz4QzPWBy-JsAFlwoIs",
}
// same as above for credentials, but also with a 'challenge':
const presentationOptions = { ...credentialOptions, "challenge": "123" }

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
            expect(payload.proof.type).to.equal('JsonWebSignature2020');
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
            expect(payload.proof.type).to.equal('JsonWebSignature2020');
            expect(payload.proof.challenge).to.equal('123')
            expect(payload.holder).to.equal('did:web:digitalcredentials.github.io')
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
            expect(payload.results[0].proof.type).to.equal('sec:JsonWebSignature2020');
            expect(payload.verified).to.be.true
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
            expect(payload.proof.type).to.equal('JsonWebSignature2020');
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
            /*  
             // Could also use a dynamically generated presentation
            const controlProofResponse = await server.inject({ 
                 method: "POST", 
                 url: '/generate/controlproof',
                 payload: {"presentationId": "456", "holder": "did:web:digitalcredentials.github.io", "verificationMethod": "did:web:digitalcredentials.github.io#96K4BSIWAkhcclKssb8yTWMQSz4QzPWBy-JsAFlwoIs", "challenge": "123"}
             });
             const signedPresentation = JSON.parse(controlProofResponse.payload) */

            const response = await server.inject({
                method: "POST",
                url: url,
                payload: sampleSignedPresentation
            });
            expect(response.statusCode).to.equal(201);
            const payload = JSON.parse(response.payload);
            expect(payload.proof.type).to.equal('JsonWebSignature2020');
            expect(payload.issuer.id).to.equal('did:web:digitalcredentials.github.io')
        }).timeout(9000);
    });

    describe("/verify/presentations", () => {
        const url = "/verify/presentations"
        it("POST returns 200", async () => {

            const controlProofResponse = await server.inject({
                method: "POST",
                url: '/generate/controlproof',
                payload: { "presentationId": "456", "holder": "did:web:digitalcredentials.github.io", "verificationMethod": "did:web:digitalcredentials.github.io#96K4BSIWAkhcclKssb8yTWMQSz4QzPWBy-JsAFlwoIs", "challenge": "123" }
            });
            const verifiablePresentation = JSON.parse(controlProofResponse.payload)

            const response = await server.inject({
                method: "POST",
                url: url,
                payload: { verifiablePresentation, options: presentationOptions }
            });
            expect(response.statusCode).to.equal(200);
            const payload = JSON.parse(response.payload);
            expect(payload).to.deep.equal({ "holder": "did:web:digitalcredentials.github.io" });
        }).timeout(9000);
    });

    describe("/generate/controlproof", () => {
        const url = "/generate/controlproof"
        it("POST returns 201 and cred", async () => {
            const response = await server.inject({
                method: "POST",
                url: url,
                payload: { "presentationId": "456", "holder": "did:web:digitalcredentials.github.io", "verificationMethod": "did:web:digitalcredentials.github.io#96K4BSIWAkhcclKssb8yTWMQSz4QzPWBy-JsAFlwoIs", "challenge": "123" }
            });
            expect(response.statusCode).to.equal(201);
            const payload = JSON.parse(response.payload);
            expect(payload.holder).to.equal("did:web:digitalcredentials.github.io");
        }).timeout(6000);


    });



})



