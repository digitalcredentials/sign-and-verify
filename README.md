# sign-and-verify

This repo currently contains signing and verification functionality and a minimal REST service that demonstrates the functionality. It may be broken up into separate repos or converted to a monorepo in the future.

The REST service implements a subset of the W3C CCG vc-http-api draft standard.


## Configuration

The service can be configured with the following environment variables:

- `UNLOCKED_DID` - a base64 encoded DID json blob (required)
- `PORT` - the port the web service will bind to (optional, default: `5000`)

Locally, you need to copy `.env.example` to `.env`, which `npm run start` will pick up, to test these values.

## Build

```
npm run build
```

## Run

```
npm run start
```

## Examples

### Issue


```
curl --header "Content-Type: application/json" --request POST --data '{"@context":["https://www.w3.org/2018/credentials/v1","https://www.w3.org/2018/credentials/examples/v1"],"id":"http://example.gov/credentials/3732","type":["VerifiableCredential","UniversityDegreeCredential"],"issuer":"did:elem:ropsten:EiBJJPdo-ONF0jxqt8mZYEj9Z7FbdC87m2xvN0_HAbcoEg","issuanceDate":"2020-03-10T04:24:12.164Z","credentialSubject":{"id":"did:elem:ropsten:EiBJJPdo-ONF0jxqt8mZYEj9Z7FbdC87m2xvN0_HAbcoEg","degree":{"type":"BachelorDegree","name":"Bachelor of Science and Arts"}}}' http://127.0.0.1:5000/issue/credentials
```

### Verify

```
curl --header "Content-Type: application/json" --request POST --data '{"@context":["https://www.w3.org/2018/credentials/v1","https://www.w3.org/2018/credentials/examples/v1"],"id":"http://example.gov/credentials/3732","type":["VerifiableCredential","UniversityDegreeCredential"],"issuer":"did:web:digitalcredentials.github.io","issuanceDate":"2020-03-10T04:24:12.164Z","credentialSubject":{"id":"did:elem:ropsten:EiBJJPdo-ONF0jxqt8mZYEj9Z7FbdC87m2xvN0_HAbcoEg","degree":{"type":"BachelorDegree","name":"Bachelor of Science and Arts"}},"proof":{"type":"/JsonWebSignature2020","dct:created":{"type":"xsd:dateTime","@value":"2020-08-07T17:20:15.221Z"},"https://w3id.org/security#jws":"eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..mEj26Gk-k8nMD0Bq6wE7GwFk6q_6C-PZMSFdGYe4CDGcnmIBTRXtSi7EN-2jHhAAJLfDOAaEHu9ZrtVhxsaDBw","https://w3id.org/security#proofPurpose":{"id":"https://w3id.org/security#assertionMethod"},"https://w3id.org/security#verificationMethod":{"id":"did:web:digitalcredentials.github.io#96K4BSIWAkhcclKssb8yTWMQSz4QzPWBy-JsAFlwoIs"}}}' http://127.0.0.1:5000/verify/credentials
```

### Request

```
curl --header "Content-Type: application/json" --request POST --data '{"subjectDid": "did:example:123"}' http://127.0.0.1:5000/request/credentials
```
