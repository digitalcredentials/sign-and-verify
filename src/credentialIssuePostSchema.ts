/*

VC schema taken from:

https://w3c-ccg.github.io/vc-api/#issue-credential

credential [object]	an object of the following form:
@context [array]
The JSON-LD context of the credential. Each item in the @context array MUST be a string.
id [string]
The ID of the credential.
type [array]
The JSON-LD type of the credential. Each item in the type array MUST be a string.
issuer [object]
A JSON-LD Verifiable Credential Issuer. The issuer object MUST be either a string or an object of the following form:
id [string]
undefined
issuanceDate [string]
The issuanceDate
expirationDate [string]
The expirationDate
credentialSubject [object]
The subject The credentialSubject object MUST be The subject (an object)
options [object]	an object of the following form:
created [string]
The date and time of the proof (with a maximum accuracy in seconds). Default current system time.
challenge [string]
A challenge provided by the requesting party of the proof. For example 6e62f66e-67de-11eb-b490-ef3eeefa55f2
domain [string]
The intended domain of validity for the proof. For example website.example
credentialStatus [object]
The method of credential status to issue the credential including. If omitted credential status will be included. The credentialStatus object MUST be an object of the following form:
type [string]
The type of credential status to issue the credential with
*/


export const credentialIssuePostSchema = {
  type: 'object',
  required: ['credential'],
  properties: {
    credential: { 
        type: 'object',
        required: ['@context', 'id', 'type', 'issuer'],
        properties: {
            '@context': {type: 'array', items: {type: 'string'}},
            id: {type: 'string'},
            type: {type: 'array', items: {type: 'string'}},
            issuer: { oneOf: [
                { type: 'string'},
                { type: 'object', properties: {id: {type: 'string'}}}
            ]},
            issuanceDate: {type: 'string'},
            expirationDate: {type: 'string'},
            credentialSubject: {type: 'object'}
        } 
    },
    options: { 
        type: 'object',
        properties: {
            created: {type: 'string'},
            challenge: {type: 'string'},
            domain: {type: 'string'},
            credentialStatus: {
                type: 'object',
                required: ['type'],
                properties: {type: {type: 'string'}}
            }
        }},
  },
}
