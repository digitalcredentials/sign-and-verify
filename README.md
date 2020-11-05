# sign-and-verify

This repo currently contains signing and verification functionality and a minimal REST service that demonstrates the functionality. It may be broken up into separate repos or converted to a monorepo in the future.

The REST service implements a subset of the W3C CCG [vc-http-api draft standard](https://w3c-ccg.github.io/vc-http-api/).

# Getting started

## Configuration

The service can be configured with the following environment variables:

- `UNLOCKED_DID` - a base64 encoded DID json blob (required)
- `PORT` - the port the web service will bind to (optional, default: `5000`)

Locally, you need to copy `.env.example` to `.env`, which `npm run start` will pick up, to test these values.

## Install

```
npm run install
```

## Build

```
npm run build
```

## Run

```
npm run start
```

## Test

```
npm run test
```

# Basic Concepts

This assumes familiarity with the basics of the [W3C Verifiable Credentials Data Model](https://www.w3.org/TR/vc-data-model/). Two key concepts are:

- [Verifiable Credential](https://www.w3.org/TR/vc-data-model/#credentials)
- [Verifiable Presentation](https://www.w3.org/TR/vc-data-model/#presentations)

The REST API exposed by this service implements a subset of the [vc-http-api](https://w3c-ccg.github.io/vc-http-api/vc-http-api) draft standard and also includes some non-standard convenience endpoints. 

The vc-http-api can be confusing when getting started, partly because it contains APIs for issuer, holders, and verifiers. Actual deployments would involve different endpoints for differely roles; or, put differently, a single instance of this service is not intended to be used by issuers, holders, and verifiers. The vc-http-api currently lacks high-level documentation, so this README provides verbose descriptions about what these APIs are used for. But these APIs ultimately (should eventually) comply with [vc-http-api](https://w3c-ccg.github.io/vc-http-api/).

# API Docs

## Issue Credential

For issuers when signing a Verifiable Credential. 

### General Format

```
curl --header "Content-Type: application/json" \
  --request POST \
  --data '{"credential": <Verifiable Credential To Sign> \
          "options": <Signing Options>' \
  <sign-and-verify-service>/issue/credentials
```

### Example

Request:

```
curl --header "Content-Type: application/json" \
  --request POST 
  --data '{"credential": {"@context":["https://www.w3.org/2018/credentials/v1","https://www.w3.org/2018/credentials/examples/v1"],"id":"http://example.gov/credentials/3732","type":["VerifiableCredential","UniversityDegreeCredential"],"issuer":"did:web:digitalcredentials.github.io","issuanceDate":"2020-03-10T04:24:12.164Z","credentialSubject":{"id":"did:elem:ropsten:EiBJJPdo-ONF0jxqt8mZYEj9Z7FbdC87m2xvN0_HAbcoEg","degree":{"type":"BachelorDegree","name":"Bachelor of Science and Arts"}}}, "options": {"verificationMethod": "did:web:digitalcredentials.github.io#96K4BSIWAkhcclKssb8yTWMQSz4QzPWBy-JsAFlwoIs"}}' \
  http://127.0.0.1:5000/issue/credentials
```

Response Codes:
- 201: success (with signed Verifiable Credential)
- 400: invalid input
- 500: error

[Reference: vc-http-api /issue/credentials](https://w3c-ccg.github.io/vc-http-api/#/Issuer/issueCredential)


## Verify Presentation

For verifiers to verify (check the proof) of a Verifiable Presentation (VP). 

Current DCC implementations also use this endpoint for a special case of VP verification, to implement a lightweight version of DID auth. The  learner's wallet generates a VP proving control over the DID (it's a VP without a VC), and the issuer checks the proof.

Additional implementation details are [Overview of Credential Request Flow](#Overview-of-Credential-Request-Flow)

### General Format

```
curl --header "Content-Type: application/json" \
  --request POST \
  --data '{"verifiablePresentation": <Verifiable Presentation> \
            "options": <Verification Options>' \
    <sign-and-verify-service>/verify/presentations
```

### Example

Request:

```
curl --header "Content-Type: application/json" \
  --request POST \
  --data '{"verifiablePresentation": {"@context":["https://www.w3.org/2018/credentials/v1"],"type":["VerifiablePresentation"],"id":"456","holder":"did:web:digitalcredentials.github.io","proof":{"type":"/JsonWebSignature2020","http://purl.org/dc/terms/created":{"type":"http://www.w3.org/2001/XMLSchema#dateTime","@value":"2020-10-12T17:06:49.767Z"},"https://w3id.org/security#challenge":"123","https://w3id.org/security#jws":"eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..4OiWb5EGPmXhtMNhmVXwyYhUI2BLbgcP0o-GNQaXBsMARfEGMTZi28BDiXmkdsCWvx2xmFD-cROvyIr-qMpeCQ","https://w3id.org/security#proofPurpose":{"id":"https://w3id.org/security#authenticationMethod"},"https://w3id.org/security#verificationMethod":{"id":"did:web:digitalcredentials.github.io#96K4BSIWAkhcclKssb8yTWMQSz4QzPWBy-JsAFlwoIs"}}}, "options": {"verificationMethod": "did:web:digitalcredentials.github.io#96K4BSIWAkhcclKssb8yTWMQSz4QzPWBy-JsAFlwoIs", "challenge":"123"}}' \
  http://127.0.0.1:5000/verify/presentations
```

Response Codes:

- 200: success
    - Specifically, it means the API request was successful AND the VP was verified 
    - VerificationResult details below
- 400: invalid input
- 500: error

Note: VerificationResult from vc-http-api isn't especially helpful at the moment, so we pass along non-standard verification metadata. Response code 200 means it's successfully verified. Additionally, in case of success, we return the non-standard `holder` field for convenience. In this example, the VerificationResult is:

```
{
   holder : did:web:digitalcredentials.github.io
}
```

[Reference: vc-http-api /verify/presentations](https://w3c-ccg.github.io/vc-http-api/#/Verifier/verifyPresentation)


## Generate proof of control
> non-standard

This is used by the learner's wallet (as a library) to generate proof of control over a DID. This is a special case of `/prove/presentations` (which this also implements), but customizes for this use case.

### General Format

```
curl --header "Content-Type: application/json" \
  --request POST \
  --data '<PROOF OPTIONS>' \
    <sign-and-verify-service>/generate/controlproof
```


PROOF_OPTIONS look like this:
```
{
  "presentationId": "<optional; provided by the wallet>",
  "holder": "<did proving control over>",
  "verificationMethod": "did:web:digitalcredentials.github.io#96K4BSIWAkhcclKssb8yTWMQSz4QzPWBy-JsAFlwoIs",
  "challenge": "<challenge provided by issuer and passed through from wallet; should match>"
}
```

### Example

Request

```
curl --header "Content-Type: application/json" \
  --request POST  \
  --data '{"presentationId": "456", "holder": "did:web:digitalcredentials.github.io", "verificationMethod": "did:web:digitalcredentials.github.io#96K4BSIWAkhcclKssb8yTWMQSz4QzPWBy-JsAFlwoIs", "challenge": "123"}' \
  http://127.0.0.1:5000/generate/controlproof
```

Response Codes:
- 201: success, with VP demonstrating proof of control (see response for this example below)
- 400: invalid input
- 500: error


Response:
```
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
      "@value": "2020-10-30T00:40:59.674Z"
    },
    "https://w3id.org/security#challenge": "123",
    "https://w3id.org/security#jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..vRfVoA-8hyh5tS5wb-3EoiSni9W1fHyvLTmumEE80v1Z3486LYdG6etRF6sjNmhrTCIyQiIOh0QwnkZ6W69sAQ",
    "https://w3id.org/security#proofPurpose": {
      "id": "https://w3id.org/security#authenticationMethod"
    },
    "https://w3id.org/security#verificationMethod": {
      "id": "did:web:digitalcredentials.github.io#96K4BSIWAkhcclKssb8yTWMQSz4QzPWBy-JsAFlwoIs"
    }
  }
}
```


## Verify Credential

Used to verify a Verifable Credential.

### General Format

```
curl --header "Content-Type: application/json" \
  --request POST \
  --data '{"verifiableCredential": <Verifiable Credential> \
            "options": <Verification Options>' \
    <sign-and-verify-service>/verify/credentials
```


### Example

Request:

```
curl --header "Content-Type: application/json" \
  --request POST \
  --data '{"verifiableCredential": {"@context":["https://www.w3.org/2018/credentials/v1","https://www.w3.org/2018/credentials/examples/v1"],"id":"http://example.gov/credentials/3732","type":["VerifiableCredential","UniversityDegreeCredential"],"issuer":"did:web:digitalcredentials.github.io","issuanceDate":"2020-03-10T04:24:12.164Z","credentialSubject":{"id":"did:elem:ropsten:EiBJJPdo-ONF0jxqt8mZYEj9Z7FbdC87m2xvN0_HAbcoEg","degree":{"type":"BachelorDegree","name":"Bachelor of Science and Arts"}},"proof":{"type":"/JsonWebSignature2020","dct:created":{"type":"xsd:dateTime","@value":"2020-10-12T16:59:13.588Z"},"https://w3id.org/security#jws":"eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..uEcrIAdPZfUdsP3uQmq-LE0PuSLlvXQLPpZiuH7JXss7phCOEHzw8z1MgG6Bf5J3AxYXmrkzPHkr2iUi-TVaBg","https://w3id.org/security#proofPurpose":{"id":"https://w3id.org/security#assertionMethod"},"https://w3id.org/security#verificationMethod":{"id":"did:web:digitalcredentials.github.io#96K4BSIWAkhcclKssb8yTWMQSz4QzPWBy-JsAFlwoIs"}}}, "options": {"verificationMethod": "did:web:digitalcredentials.github.io#96K4BSIWAkhcclKssb8yTWMQSz4QzPWBy-JsAFlwoIs"}}' \
  http://127.0.0.1:5000/verify/credentials
```

Response Codes:
- 200: success, and Verifiable Credential successfully verified.
- 400: invalid input
- 500: error

Note: VerificationResult from vc-http-api isn't especially helpful at the moment, so we pass along verification metadata. But response code 200 means it's successfully verified.


## Request a Demo Credential 

Without proof of control of DID

### Example
```
curl --header "Content-Type: application/json" \
  --request POST \
  --data '{"holder": "did:example:me"}' \
  http://127.0.0.1:5000/request/democredential/nodidproof
```  

# Overview of Credential Request Flow

The vc-http-api standard doesn't include specific methods related to credential request. Similarly, the credential request protocol is not overly-specified by DCC, to allow issuers flexibility to adapt it to their processes. But there are certain request/response elements expected by the DCC wallet, which this service can help with. This section describes how the DCC credential request flow relates to sign-and-verify

## Request Structure

A credential request coming from the DCC wallet will be of the form:

```
curl --header "Content-Type: application/json" \
  --header "Authorization: Bearer <TOKEN>" \
  --request POST \
  --data <REQUEST_PAYLOAD> \
   <request_endpoint>
```

`request_endpoint` is provided by the issuer as part of the [DEEP_LINK](https://github.com/digitalcredentials/docs/blob/main/request/credential_request.md#request-credential-initial-state) to the DCC wallet. The DCC wallet will parse it from the DEEP_LINK and call it during the credential request.

`REQUEST_PAYLOAD` has structure described by the [generate proof of control response](#Generate-proof-of-control). It's recommended that issuers verify several aspects of payload; relevant fields are highlighted below.

```
{
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    ...
    "type": ["VerifiablePresentation"],
    "holder": <HOLDER_DID>,
    "proof": {
      "challenge": "<Expected 1-time challenge>",
      "verificationMethod": {
        "id": <Used for VP verification options>
      }
      ...
    }
}
```

About `REQUEST_PAYLOAD`:
- `HOLDER_DID` is the subject DID the issuer would issue the credential to
- `challenge` is expected to match the challenge the issuer previously provided in the links
- `proof.verificationMethod.id` will be used as an argument when verifying the VP


## DID (Proof of Control) Verification

It's recommended that the issuer verify the `REQUEST_PAYLOAD` provided by the learner's DCC wallet before issuing the credential

Issuers can use the `/verify/presentations` endpoint described above to verify the DID contained in the subject's credential request. 

The general structure of a `/verify/presentations` call looks like this:

```
curl --header "Content-Type: application/json"  \
    --request POST \
    --data '{ verifiablePresentation: "<REQUEST_PAYLOAD>", \
      options: { \
      verificationMethod: "<REQUEST_PAYLOAD.proof.verificationMethod.id>", \ 
      challenge: "<Expected 1-time challenge>" }' \
    <sign-and-verify-endpoint>/verify/presentations
```

As described in [Verify Presentation](#Verify-Presentation), response code 200 means it's successfully verified. Additionally, in case of success, we return the non-standard `holder` field for convenience. In this example, the VerificationResult is:

```
{
   holder : did:web:digitalcredentials.github.io
}
```


### Example

Assumptions:
- sign-and-verify is running locally on port 5000
- subject DID is `did:web:digitalcredentials.github.io` in this example

Experimental code (partially) demonstrating this: https://github.com/digitalcredentials/issuer-demo

#### CURL command to verify VP

```
curl --header "Content-Type: application/json" --request POST --data '{"verifiablePresentation": {"@context":["https://www.w3.org/2018/credentials/v1"],"type":["VerifiablePresentation"],"id":"456","holder":"did:web:digitalcredentials.github.io","proof":{"type":"/JsonWebSignature2020","http://purl.org/dc/terms/created":{"type":"http://www.w3.org/2001/XMLSchema#dateTime","@value":"2020-10-12T17:06:49.767Z"},"https://w3id.org/security#challenge":"123","https://w3id.org/security#jws":"eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..4OiWb5EGPmXhtMNhmVXwyYhUI2BLbgcP0o-GNQaXBsMARfEGMTZi28BDiXmkdsCWvx2xmFD-cROvyIr-qMpeCQ","https://w3id.org/security#proofPurpose":{"id":"https://w3id.org/security#authenticationMethod"},"https://w3id.org/security#verificationMethod":{"id":"did:web:digitalcredentials.github.io#96K4BSIWAkhcclKssb8yTWMQSz4QzPWBy-JsAFlwoIs"}}}, "options": {"verificationMethod": "did:web:digitalcredentials.github.io#96K4BSIWAkhcclKssb8yTWMQSz4QzPWBy-JsAFlwoIs", "challenge":"123"}}' http://127.0.0.1:5000/verify/presentations
```


##### Verifiable Presentation (formatted):
Formatted for clarity and security-context normalized. This payload is passed through from subject (`REQUEST_PAYLOAD`):
```
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
      "created": {
        "type": "http://www.w3.org/2001/XMLSchema#dateTime",
        "@value": "2020-10-12T17:06:49.767Z"
      },
      "challenge": "123",
      "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..4OiWb5EGPmXhtMNhmVXwyYhUI2BLbgcP0o-GNQaXBsMARfEGMTZi28BDiXmkdsCWvx2xmFD-cROvyIr-qMpeCQ",
      "proofPurpose": {
        "id": "https://w3id.org/security#authenticationMethod"
      },
      "verificationMethod": {
        "id": "did:web:digitalcredentials.github.io#96K4BSIWAkhcclKssb8yTWMQSz4QzPWBy-JsAFlwoIs"
      }
    }
}
```

##### Options (formatted):

Formatted for clarity. 

```
{
  "verificationMethod": "did:web:digitalcredentials.github.io#96K4BSIWAkhcclKssb8yTWMQSz4QzPWBy-JsAFlwoIs",
  "challenge": "123"
}
```

