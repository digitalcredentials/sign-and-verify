# sign-and-verify

This repo currently contains signing and verification functionality and a minimal REST service that demonstrates the functionality. It may be broken up into separate repos or converted to a monorepo in the future.

The REST service implements a subset of the W3C CCG [vc-http-api draft standard](https://w3c-ccg.github.io/vc-http-api/).


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

## API Documentation

This REST API implements a subset of the vc-http-api draft standard. See the [swagger definition of vc-http-api](https://w3c-ccg.github.io/vc-http-api/).


## Examples

### Issue


```
curl --header "Content-Type: application/json" \
  --request POST 
  --data '{"credential": {"@context":["https://www.w3.org/2018/credentials/v1","https://www.w3.org/2018/credentials/examples/v1"],"id":"http://example.gov/credentials/3732","type":["VerifiableCredential","UniversityDegreeCredential"],"issuer":"did:web:digitalcredentials.github.io","issuanceDate":"2020-03-10T04:24:12.164Z","credentialSubject":{"id":"did:elem:ropsten:EiBJJPdo-ONF0jxqt8mZYEj9Z7FbdC87m2xvN0_HAbcoEg","degree":{"type":"BachelorDegree","name":"Bachelor of Science and Arts"}}}, "options": {"verificationMethod": "did:web:digitalcredentials.github.io#96K4BSIWAkhcclKssb8yTWMQSz4QzPWBy-JsAFlwoIs"}}' \
  http://127.0.0.1:5000/issue/credentials
```

### Verify Credential

```
curl --header "Content-Type: application/json" \
  --request POST \
  --data '{"verifiableCredential": {"@context":["https://www.w3.org/2018/credentials/v1","https://www.w3.org/2018/credentials/examples/v1"],"id":"http://example.gov/credentials/3732","type":["VerifiableCredential","UniversityDegreeCredential"],"issuer":"did:web:digitalcredentials.github.io","issuanceDate":"2020-03-10T04:24:12.164Z","credentialSubject":{"id":"did:elem:ropsten:EiBJJPdo-ONF0jxqt8mZYEj9Z7FbdC87m2xvN0_HAbcoEg","degree":{"type":"BachelorDegree","name":"Bachelor of Science and Arts"}},"proof":{"type":"/JsonWebSignature2020","dct:created":{"type":"xsd:dateTime","@value":"2020-10-12T16:59:13.588Z"},"https://w3id.org/security#jws":"eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..uEcrIAdPZfUdsP3uQmq-LE0PuSLlvXQLPpZiuH7JXss7phCOEHzw8z1MgG6Bf5J3AxYXmrkzPHkr2iUi-TVaBg","https://w3id.org/security#proofPurpose":{"id":"https://w3id.org/security#assertionMethod"},"https://w3id.org/security#verificationMethod":{"id":"did:web:digitalcredentials.github.io#96K4BSIWAkhcclKssb8yTWMQSz4QzPWBy-JsAFlwoIs"}}}, "options": {"verificationMethod": "did:web:digitalcredentials.github.io#96K4BSIWAkhcclKssb8yTWMQSz4QzPWBy-JsAFlwoIs"}}' \
  http://127.0.0.1:5000/verify/credentials
```

### Verify Presentation

See details below

```
curl --header "Content-Type: application/json" \
  --request POST \
  --data '{"verifiablePresentation": {"@context":["https://www.w3.org/2018/credentials/v1"],"type":["VerifiablePresentation"],"id":"456","holder":"did:web:digitalcredentials.github.io","proof":{"type":"/JsonWebSignature2020","http://purl.org/dc/terms/created":{"type":"http://www.w3.org/2001/XMLSchema#dateTime","@value":"2020-10-12T17:06:49.767Z"},"https://w3id.org/security#challenge":"123","https://w3id.org/security#jws":"eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..4OiWb5EGPmXhtMNhmVXwyYhUI2BLbgcP0o-GNQaXBsMARfEGMTZi28BDiXmkdsCWvx2xmFD-cROvyIr-qMpeCQ","https://w3id.org/security#proofPurpose":{"id":"https://w3id.org/security#authenticationMethod"},"https://w3id.org/security#verificationMethod":{"id":"did:web:digitalcredentials.github.io#96K4BSIWAkhcclKssb8yTWMQSz4QzPWBy-JsAFlwoIs"}}}, "options": {"verificationMethod": "did:web:digitalcredentials.github.io#96K4BSIWAkhcclKssb8yTWMQSz4QzPWBy-JsAFlwoIs", "challenge":"123"}}' \
  http://127.0.0.1:5000/verify/presentations
```

## Requesting Credentials

The endpoint to request credentials is not part of the vc-http-api standard. It's also not over-specified by DCC to allow issuers flexibility to adapt it to their processes. But there are certain elements expected by the DCC wallet.

A DCC wallet request will be of the form:

```
curl --header "Content-Type: application/json" \
  --header "Authorization: Bearer <TOKEN>" \
  --request POST \
  --data <REQUEST_PAYLOAD> \
   <request_endpoint>
```

`request_endpoint` is provided by the issuer as part of the [DEEP_LINK](https://github.com/digitalcredentials/docs/blob/main/request/credential_request.md#request-credential-initial-state) to the DCC wallet. The DCC wallet will parse it from the DEEP_LINK and call it during the credential request.

`REQUEST_PAYLOAD` has the following structure:

```
{
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    ...
    "type": ["VerifiablePresentation"],
    "holder": <HOLDER_DID>,
    "proof": {
      challenge: "<Expected 1-time challenge>",
      ...
    }
}
```

About `REQUEST_PAYLOAD`:
- `HOLDER_DID` is the subject DID the issuer would issue the credential to
- `challenge` is expected to match the challenge the issuer previously provided in the links
- This entire structure is called a "Verifiable Presentation", which we are using to allow the learner to prove control over the DID they provided


### DID Verification

It's recommended that the issuer verify the `REQUEST_PAYLOAD` provided by the learner's DCC wallet before issuing the credential

Issuers can use the `/verify/presentations` endpoint described above to verify the DID contained in the subject's credential request. 

The general structure of a `/verify/presentations` call looks like this:
```
curl --header "Content-Type: application/json"  \
    --request POST \
    --data '<VERIFY_VP>'  \
    <sign-and-verify-endpoint>/verify/presentations
```

The `VERIFY_VP` payload has this structure:

```
{
  verifiablePresentation: "<REQUEST_PAYLOAD>",
  options: {
    verificationMethod: "<REQUEST_PAYLOAD.holder>",
    challenge: "<Expected 1-time challenge>"
  }
}
```

Per the [vc-http-api definition](https://w3c-ccg.github.io/vc-http-api/#/Verifier/verifyPresentation) of `/verify/presentations`, the status code will be 200 if successfully verified. There is an additional response body with details if detailed verification output is desired.


> Note: the `/verify/presentations` API.contract comes from [vc-http-api](https://w3c-ccg.github.io/vc-http-api/). It's awkward, because `options`, constructed by issuer, always seems to use the `verificationMethod` provided from the subject's request. I have a tracking issue to clarify, and we can change default behavior on sign-and-verify to recognize this.


### Example

Assumptions:
- sign-and-verify is running locally on port 5000
- subject DID is `did:web:digitalcredentials.github.io` in this example

Experimental code (partially) demonstrating this: https://github.com/digitalcredentials/issuer-demo

#### CURL command to verify VP

```
curl --header "Content-Type: application/json" --request POST --data '{"verifiablePresentation": {"@context":["https://www.w3.org/2018/credentials/v1"],"type":["VerifiablePresentation"],"id":"456","holder":"did:web:digitalcredentials.github.io","proof":{"type":"/JsonWebSignature2020","http://purl.org/dc/terms/created":{"type":"http://www.w3.org/2001/XMLSchema#dateTime","@value":"2020-10-12T17:06:49.767Z"},"https://w3id.org/security#challenge":"123","https://w3id.org/security#jws":"eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..4OiWb5EGPmXhtMNhmVXwyYhUI2BLbgcP0o-GNQaXBsMARfEGMTZi28BDiXmkdsCWvx2xmFD-cROvyIr-qMpeCQ","https://w3id.org/security#proofPurpose":{"id":"https://w3id.org/security#authenticationMethod"},"https://w3id.org/security#verificationMethod":{"id":"did:web:digitalcredentials.github.io#96K4BSIWAkhcclKssb8yTWMQSz4QzPWBy-JsAFlwoIs"}}}, "options": {"verificationMethod": "did:web:digitalcredentials.github.io#96K4BSIWAkhcclKssb8yTWMQSz4QzPWBy-JsAFlwoIs", "challenge":"123"}}' http://127.0.0.1:5000/verify/presentations
```


#### Verifiable Presentation (formatted):
Formatted for clarity. This payload is passed through from subject:
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

#### Options (formatted):

Formatted for clarity. 

Notes:
- `verificationMethod` has the awkwardness described above
- issuer should provide `challenge` to ensure the value in the VP payload is what we expect

```
{
  "verificationMethod": "did:web:digitalcredentials.github.io#96K4BSIWAkhcclKssb8yTWMQSz4QzPWBy-JsAFlwoIs",
  "challenge": "123"
}
```



