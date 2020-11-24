# sign-and-verify-core

Signing and verification of [Verifiable Credentials](https://www.w3.org/TR/vc-data-model/#credentials) and [Verifiable Presentations](https://www.w3.org/TR/vc-data-model/#presentations) given an unlocked DID Document.

# Usage

Install the npm package:

```
npm i sign-and-verify-core
OR
yarn add sign-and-verify-core
```

Create an issuer - there are two ways to create an issuer, both need an unlocked DID document (like this one: [unlockedDID](data/unlocked-did:web:digitalcredentials.github.io.json)) with which to sign:

```
getDefaultIssuer()          // assumes you've set the DID in an environment variable called UNLOCKED_DID, as a base64 encoded DID json blob
createIssuer(unlockedDidDocument)   // pass the DID directly as an object
```

and then use that issuer...

## Examples

You can see a lot of this in [tests](src/issuer.spec.ts) - we just reproduce it here to make it easier to understand if you are new to javascript, or to testing, or really just want to see the important parts without distractions. 

NOTE:  where we say 'presentation', we mean a [Verifiable Presentation](https://www.w3.org/TR/vc-data-model/#presentations)
NOTE:  where we say 'credential', we mean a [Verifiable Credential](https://www.w3.org/TR/vc-data-model/#credentials)

```
import createIssuer from sign-and-verify-core;

/* 
Load your unlocked DID from wherever you like.  For example, from the file system (if say you copied the 
[unlockedDID](data/unlocked-did:web:digitalcredentials.github.io.json) from this repo to your project):
*/
const unlockedDidDocument = JSON.parse(readFileSync("data/unlocked-did:web:digitalcredentials.github.io.json").toString("ascii"));

// create the issuer, passing in the unlocked DID document
const { sign, requestDemoCredential, verify, signPresentation, createAndSignPresentation, verifyPresentation } = createIssuer(unlockedDidDocument)

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
		"id": "did:example:me",
		"degree": {
			"type": "BachelorDegree",
			"name": "Bachelor of Science and Arts"
		}
	},
	"proof": {
		"type": "JsonWebSignature2020",
		"created": "2020-11-12T23:56:27.928Z",
		"jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..2DppQ4Euf9PUX6NrFPyJwHKPmeAqNWAC6UH8kiFNbsoiinebPpwdortHe-bLzDOQ_W7MQD5nqOnNN8JIVGarAA",
		"proofPurpose": "assertionMethod",
		"verificationMethod": "did:web:digitalcredentials.github.io#96K4BSIWAkhcclKssb8yTWMQSz4QzPWBy-JsAFlwoIs"
	}
}

const sampleUnsignedPresentation = {
  '@context': [
    'https://www.w3.org/2018/credentials/v1',
    'https://www.w3.org/2018/credentials/examples/v1',
    'https://w3c-ccg.github.io/lds-jws2020/contexts/lds-jws2020-v1.json'
  ],
  type: [ 'VerifiablePresentation' ],
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
const presentationOptions = {...credentialOptions, "challenge": "123"}

/* CREDENTIAL EXAMPLES */

// sign a credential
const result = sign(sampleUnsignedCredential, credentialOptions)

// verify a credential
const result = verify(sampleSignedCredential, credentialOptions)

// Request a demo credential, providing a signed presentation to prove DID ownership (control)
const result = requestDemoCredential(sampleSignedPresentation)


// Request a demo credential - without providing a full presentation to prove DID ownership.
// Instead, simply provide an object with a holder property where we'd expect one in a presentation,
// so kind of like a presentation stripped down to just the holder property.
const minimalPresentation = { holder: "did:example:me" }
const shouldSkipVerification = true
const result = requestDemoCredential(minimalPresentation, shouldSkipVerification)

/* PRESENTATION EXAMPLES */

// sign a provided presentation
const result = signPresentation(sampleUnsignedPresentation, presentationOptions)

// verify a presentation
// Note:  for fun and profit, you could also verify the signed presentation returned 
// from the 'signPresentation' step above
const result = verifyPresentation(sampleSignedPresentation, presentationOptions)

const presentationId = '456'
const holderDID = 'did:example:me';
// construct and sign a presentation that wraps a given signed credential
const result = createAndSignPresentation(sampleSignedCredential, presentationId, holderDID, presentationOptions);

// construct and sign a presentation, without providing an associated credential (hence the null argument)
const result = createAndSignPresentation(null, presentationId, holderDID, presentationOptions);
```

# References

This assumes familiarity with the basics of the [W3C Verifiable Credentials Data Model](https://www.w3.org/TR/vc-data-model/). Two key concepts are:

- [Verifiable Credential](https://www.w3.org/TR/vc-data-model/#credentials)
- [Verifiable Presentation](https://www.w3.org/TR/vc-data-model/#presentations)

# Development

To make changes to the package:

## Install

```
npm run install
```

## Build

```
npm run build
```

## Test

```
npm run test
```

## Publish to NPM

```
npm publish --access public
```

Before publishing, do make sure you are logged into npm on the command line, e.g., with 

```
npm adduser
```

Note that `npm publish --access public` will trigger the `prepublishOnly` script to first run the build
