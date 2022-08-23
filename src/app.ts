import axios from 'axios';
import fastify from 'fastify';
import fastifyRawBody from 'fastify-raw-body';
import fastifySensible from 'fastify-sensible';
import { createIssuer, createVerifier, DIDDocument } from '@digitalcredentials/sign-and-verify-core';
import { Ed25519VerificationKey2020 } from '@digitalcredentials/ed25519-verification-key-2020';
import { X25519KeyAgreementKey2020 } from '@digitalcredentials/x25519-key-agreement-key-2020';
import { CryptoLD } from 'crypto-ld';
import * as didWeb from '@interop/did-web-resolver';
import * as didKey from '@digitalcredentials/did-method-key';
import { decodeList } from '@digitalbazaar/vc-status-list';
import { AuthType, credentialRecordFromOidc, credentialRecordFromChallenge } from './issuer';
import { getConfig, decodeSeed } from './config';
import { default as demoCredential } from './demoCredential.json';
import { v4 as uuidv4 } from 'uuid';
import LRU from 'lru-cache';
import { composeCredential } from './templates/Certificate';
import {
  BaseCredentialStatusClient,
  composeStatusCredential,
  CredentialState,
  CredentialStatusClientType,
  CredentialStatusConfigData,
  CredentialStatusLogData,
  CredentialStatusLogEntry,
  CredentialStatusRequest,
} from './credential-status';
import { GithubCredentialStatusClient } from './credential-status-github';
import { GitlabCredentialStatusClient } from './credential-status-gitlab';
import { CREDENTIAL_STATUS_FOLDER, InternalCredentialStatusClient } from './credential-status-internal';

const cryptoLd = new CryptoLD();
cryptoLd.use(Ed25519VerificationKey2020);
cryptoLd.use(X25519KeyAgreementKey2020);

// LRU cache for issuer membership registry with max age of one hour
const LRU_OPTIONS = { maxAge: 1000 * 60 * 60 };
const issuerMembershipRegistryCache = new LRU(LRU_OPTIONS);

// Tool used to generate did:web from secret seed
const didWebDriver = didWeb.driver({ cryptoLd });

// Tool used to generate did:key from secret seed
const didKeyDriver = didKey.driver();

const VERIFICATION_METHOD_PURPOSES = [
  'authentication',
  'assertionMethod',
  'capabilityDelegation',
  'capabilityInvocation',
  'keyAgreement'
];

export function extractAccessToken(headers): string | undefined {
  if (!headers.authorization) {
    return;
  }
  const [scheme, token] = headers.authorization.split(' ');
  if (scheme === 'Bearer') {
    return token;
  }
}

const ensureId = (field) => {
  if (typeof field === 'object') {
    return field.id;
  }
  return field;
};

function copyFromMethod (didDocument, methodToCopy) {
  const didDocumentClone = JSON.parse(JSON.stringify(didDocument));
  const methodForPurpose = didDocument[methodToCopy][0];
  const methodForPurposeClone = JSON.parse(JSON.stringify(methodForPurpose));
  VERIFICATION_METHOD_PURPOSES.forEach((purpose) => {
    didDocumentClone[purpose] = [methodForPurposeClone];
  });
  return didDocumentClone;
}

function privatizeDid (didDocument, getMethodForPurpose, methodToCopy?) {
  const didDocumentClone = JSON.parse(JSON.stringify(didDocument));
  VERIFICATION_METHOD_PURPOSES.forEach((purpose) => {
    const methodForPurpose = getMethodForPurpose({ purpose: methodToCopy || purpose });
    const methodForPurposeClone = JSON.parse(JSON.stringify(methodForPurpose));
    didDocumentClone[purpose] = [methodForPurposeClone];
  });
  return didDocumentClone;
}

function constructDemoCredential(holder: string, id = uuidv4(), issuanceDate = new Date().toISOString()): any {
  const credential = JSON.parse(JSON.stringify(demoCredential));
  credential.id = id;
  credential.credentialSubject.id = holder;
  credential.issuanceDate = issuanceDate;
  return credential;
}

export async function build(opts = {}) {
  const {
    authType,
    didSeed,
    didWebUrl,
    vcApiIssuerUrlHost,
    vcApiIssuerUrlProtocol,
    demoIssuerMethod,
    issuerMembershipRegistryUrl,
    credStatusClientType,
    credStatusRepoName,
    credStatusRepoOrgName,
    credStatusRepoOrgId,
    credStatusRepoVisibility,
    credStatusClientAccessToken,
  } = getConfig();
  const didSeedBytes = decodeSeed(didSeed);
  const privateDids: DIDDocument[] = [];
  const publicDids: DIDDocument[] = [];

  if (didWebUrl) {
    const {
      didDocument: didWebDocument, methodFor: didWebMethodFor
    } = await didWebDriver.generate({ url: didWebUrl, seed: didSeedBytes });
    let publicDidWeb: DIDDocument = JSON.parse(JSON.stringify(didWebDocument));
    const methodToCopy = 'assertionMethod';
    publicDidWeb = copyFromMethod(publicDidWeb, methodToCopy);
    const privateDidWeb = privatizeDid(didWebDocument, didWebMethodFor, methodToCopy);
    privateDids.push(privateDidWeb);
    publicDids.push(publicDidWeb);
  }

  const {
    didDocument: didKeyDocument, methodFor: didKeyMethodFor
  } = await didKeyDriver.generate({ seed: didSeedBytes });
  const publicDidKey: DIDDocument = JSON.parse(JSON.stringify(didKeyDocument));
  if (!didWebUrl && didKeyDocument.id !== demoIssuerMethod) {
    // Issuer is using did:key, and the secret key seed does not match
    console.error(
      new Error('The secret DID_SEED does not match DEMO_ISSUER_METHOD.'));
    process.exit(1);
  }

  const privateDidKey = privatizeDid(didKeyDocument, didKeyMethodFor);
  privateDids.push(privateDidKey);
  publicDids.push(publicDidKey);

  const { sign, signPresentation, createAndSignPresentation } = createIssuer(privateDids);
  const { verify, verifyPresentation } = createVerifier(publicDids);

  const issuerMembershipRegistry = (await axios.get(issuerMembershipRegistryUrl)).data.registry;
  issuerMembershipRegistryCache.set('issuerMembershipRegistry', issuerMembershipRegistry);

  const server = fastify({
    logger: true
  });

  // Setup the credential status client
  let credStatusClient: BaseCredentialStatusClient;
  switch (credStatusClientType) {
    case CredentialStatusClientType.Github:
      credStatusClient = new GithubCredentialStatusClient({
        credStatusRepoName,
        credStatusRepoOrgName,
        credStatusRepoVisibility,
        credStatusClientAccessToken
      });
      break;
    case CredentialStatusClientType.Gitlab:
      credStatusClient = new GitlabCredentialStatusClient({
        credStatusRepoName,
        credStatusRepoOrgName,
        credStatusRepoOrgId,
        credStatusRepoVisibility,
        credStatusClientAccessToken
      });
      break;
    case CredentialStatusClientType.Internal:
      credStatusClient = new InternalCredentialStatusClient({ vcApiIssuerUrlHost, vcApiIssuerUrlProtocol });
      break;
  }

  // Setup status credential
  const credentialStatusUrl = credStatusClient.getCredentialStatusUrl();
  const repoExists = await credStatusClient.statusRepoExists();
  if (!repoExists) {
    // Create status repo
    await credStatusClient.createStatusRepo();

    // Create and persist status config
    const listId = credStatusClient.generateStatusListId();
    const configData: CredentialStatusConfigData = {
      credentialsIssued: 0,
      latestList: listId
    };
    await credStatusClient.createConfigData(configData);

    // Create and persist status log
    const logData = [];
    await credStatusClient.createLogData(logData);

    // Create and sign status credential
    const issuerDid = publicDids[0].id;
    const credentialId = `${credentialStatusUrl}/${listId}`;
    const statusCredentialDataUnsigned = await composeStatusCredential({ issuerDid, credentialId });
    const verificationMethod = ensureId(publicDids[0].assertionMethod[0]);
    const statusCredentialData = await sign(statusCredentialDataUnsigned, { verificationMethod });

    // Create and persist status data
    await credStatusClient.createStatusData(statusCredentialData);

    // Setup credential status website
    await credStatusClient.setupCredentialStatusWebsite();
  } else {
    // Sync status repo state
    await credStatusClient.syncStatusRepoState();
  }

  server.register(require('fastify-cors'), {});
  server.register(require('fastify-swagger'), {
    routePrefix: '/docs',
    mode: 'static',
    specification: {
      path: __dirname + '/vc-http-api-0.0.0.yaml'
    },
    exposeRoute: true
  });
  server.register(fastifySensible);
  server.register(fastifyRawBody, {
    global: false, // don't add the rawBody to every request.
    runFirst: true // get the body before any preParsing hook change/uncompress it.
  });

  server.setErrorHandler(function (error, request, reply) {
    //request.log.error(error);
    reply
      .code(500)
      // .header('Content-Type', 'application/json; charset=utf-8')
      // .send(error)
      .header('Content-Type', 'plain/text; charset=utf-8')
      .send(JSON.stringify(error, null, 2));
  });

  server.get('/status', async (request, reply) => {
    reply
      .code(200)
      .header('Content-Type', 'application/json; charset=utf-8')
      .send({ status: 'OK' });
  });

  server.get(`/${CREDENTIAL_STATUS_FOLDER}/:listId`, async (request, reply) => {
    const statusCredentialData = await credStatusClient.readStatusData();
    const statusCredentialDataString = JSON.stringify(statusCredentialData, null, 2);
    reply
      .code(200)
      .header('Content-Type', 'application/json; charset=utf-8')
      .send(statusCredentialDataString);
  });

  server.post(
    '/request/credential', async (request, reply) => {
      const { headers, body } = request;

      const accessToken = extractAccessToken(headers);
      // Verify that access token was included in request
      if (authType === AuthType.OidcToken && !accessToken) {
        return reply
          .code(401)
          .send({ message: 'Failed to provide access token in request' });
      }

      // VP is placed directly in body
      const verifiablePresentation: any = body;
      // provided by issuer via diploma, email, LMS (e.g., Canvas), etc.
      const challenge = verifiablePresentation?.proof?.challenge;
      // holder DID generated by credential wallet
      const holderDid = verifiablePresentation.holder;
      // issuer DID generated by build function above
      const issuerDid = publicDids[0].id;
      // formal verification of presentation
      const verificationResult = await verifyPresentation({
        verifiablePresentation, issuerMembershipRegistry, options: { challenge }
      });
      if (!verificationResult.verified) {
        return reply
          .code(400)
          .send({ message: 'Could not validate request', error: verificationResult });
      }

      let credentialRecord;
      try {
        switch (authType) {
          case AuthType.OidcToken:
            credentialRecord = await credentialRecordFromOidc(accessToken);
            break;
          case AuthType.VpChallenge:
            credentialRecord = await credentialRecordFromChallenge(challenge);
            break;
        }
      } catch (error: any) {
        return reply
          .code(400)
          .send({ message: error.message });
      }

      if (!credentialRecord) {
        return reply
          .code(404)
          .send({ message: 'Learner record not found for holder' });
      }

      // Currently using only templates/Certificate.ts
      const credentialBase = composeCredential(issuerDid, holderDid, credentialRecord);

      try {
        // Attach status to credential
        const { credential, newList } = await credStatusClient.embedCredentialStatus({ credential: credentialBase });

        // Setup data necessary for composing signed status credential
        // NOTE: these values are retrieved from the issuer DID document;
        // for now, we default to the did and verification method of the first did in publicDids
        // TODO: if we want to support multiple verification methods,
        // issuer should provide proper one to use via deep link query
        // parameter passed through options, or some other mechanism
        const issuerDid = publicDids[0].id;
        const verificationMethod = ensureId(publicDids[0].assertionMethod[0]);

        // Create new status credential only if a new list was created
        if (newList) {
          // Create and sign status credential
          const statusCredentialId = `${credentialStatusUrl}/${newList}`;
          const statusCredentialDataUnsigned = await composeStatusCredential({ issuerDid, credentialId: statusCredentialId });
          const statusCredentialData = await sign(statusCredentialDataUnsigned, { verificationMethod });

          // Create and persist status data
          await credStatusClient.createStatusData(statusCredentialData);
        }

        // Sign credential
        const options = { verificationMethod };
        const result = await sign(credential, options);

        // Add new entry to status log
        const { id: credentialStatusId, statusListCredential, statusListIndex } = credential.credentialStatus;
        const statusListId = statusListCredential.split('/').slice(-1).pop(); // retrieve status list id from status credential url
        const statusLogEntry: CredentialStatusLogEntry = {
          timestamp: (new Date()).toISOString(),
          credentialId: credential.id || credentialStatusId,
          credentialIssuer: issuerDid,
          credentialSubject: credential.credentialSubject?.id,
          credentialState: CredentialState.Issued,
          verificationMethod,
          statusListId,
          statusListIndex
        };
        const statusLogData = await credStatusClient.readLogData();
        statusLogData.push(statusLogEntry);
        await credStatusClient.updateLogData(statusLogData);

        reply
          .code(200)
          .header('Content-Type', 'application/json; charset=utf-8')
          .send(result);
      } catch (error: any) {
        reply
          .code(400)
          .send({ message: error.message });
      }
    }
  )

  server.post(
    '/issue/credentials', async (request, reply) => {
      const req: any = request.body;

      try {
        // Attach status to credential
        const { credential, newList } = await credStatusClient.embedCredentialStatus({ credential: req.credential });

        // Setup data necessary for composing signed status credential
        const issuerDid = publicDids[0].id;
        const verificationMethod = ensureId(publicDids[0].assertionMethod[0]);

        // Create new status credential only if a new list was created
        if (newList) {
          // Create and sign status credential
          const statusCredentialId = `${credentialStatusUrl}/${newList}`;
          const statusCredentialDataUnsigned = await composeStatusCredential({ issuerDid, credentialId: statusCredentialId });
          const statusCredentialData = await sign(statusCredentialDataUnsigned, { verificationMethod });

          // Create and persist status data
          await credStatusClient.createStatusData(statusCredentialData);
        }

        // Sign credential
        const options = req.options;
        const result = await sign(credential, options);

        // Add new entry to status log
        const { id: credentialStatusId, statusListCredential, statusListIndex } = credential.credentialStatus;
        const statusListId = statusListCredential.split('/').slice(-1).pop(); // retrieve status list id from status credential url
        const statusLogEntry: CredentialStatusLogEntry = {
          timestamp: (new Date()).toISOString(),
          credentialId: credential.id || credentialStatusId,
          credentialIssuer: issuerDid,
          credentialSubject: credential.credentialSubject?.id,
          credentialState: CredentialState.Issued,
          verificationMethod,
          statusListId,
          statusListIndex
        };
        const statusLogData = await credStatusClient.readLogData();
        statusLogData.push(statusLogEntry);
        await credStatusClient.updateLogData(statusLogData);

        reply
          .code(201)
          .header('Content-Type', 'application/json; charset=utf-8')
          .send(result);
      } catch (error: any) {
        reply
          .code(400)
          .send({ message: error.message });
      }
    }
  )

  server.post(
    '/credentials/status', async (request, reply) => {
      const { credentialId, credentialStatus } = request.body as CredentialStatusRequest;
      const logData: CredentialStatusLogData = await credStatusClient.readLogData();
      const logEntry = logData.find((entry) => {
        return entry.credentialId === credentialId;
      });

      // Unable to find credential with given id
      if (!logEntry) {
        return reply
          .code(404)
          .send({ message: 'Credential not found' });
      }

      const { statusListId, statusListIndex } = logEntry as CredentialStatusLogEntry;

      try {
        // Setup data necessary for composing signed status credential
        const issuerDid = publicDids[0].id;
        const verificationMethod = ensureId(publicDids[0].assertionMethod[0]);

        // Retrieve status credential
        const statusCredentialDataBefore = await credStatusClient.readStatusData();
        const statusCredentialListEncodedBefore = statusCredentialDataBefore.credentialSubject.encodedList;

        // Update status credential
        const statusCredentialListDecoded = await decodeList({ encodedList: statusCredentialListEncodedBefore });
        statusCredentialListDecoded.setStatus(statusListIndex, true);
        const statusCredentialId = `${credentialStatusUrl}/${statusListId}`;
        const statusCredentialDataUnsigned = await composeStatusCredential({ issuerDid, credentialId: statusCredentialId, statusList: statusCredentialListDecoded });

        // Resign and persist status credential
        const statusCredentialDataAfter = await sign(statusCredentialDataUnsigned, { verificationMethod });
        await credStatusClient.updateStatusData(statusCredentialDataAfter);

        // Add new entries to status log
        const statusLogData = await credStatusClient.readLogData();
        for (let item of credentialStatus) {
          const { status } = item;
          const statusLogEntry: CredentialStatusLogEntry = {
            timestamp: (new Date()).toISOString(),
            credentialId: credentialId,
            credentialIssuer: issuerDid,
            credentialState: status as CredentialState,
            verificationMethod,
            statusListId,
            statusListIndex
          };
          statusLogData.push(statusLogEntry);
        }
        await credStatusClient.updateLogData(statusLogData);

        reply
          .code(200)
          .header('Content-Type', 'application/json; charset=utf-8')
          .send(statusCredentialDataAfter);
      } catch (error: any) {
        reply
          .code(400)
          .send({ message: error.message });
      }
    }
  );

  server.post(
    '/prove/presentations', async (request, reply) => {
      const req: any = request.body;
      const credential = req.presentation;
      const options = req.options;

      const result = await signPresentation(credential, options);
      reply
        .code(201)
        .header('Content-Type', 'application/json; charset=utf-8')
        .send(result);
    }
  )

  server.post(
    '/verify/credentials', async (request, reply) => {
      const req: any = request.body;
      const verifiableCredential = req.verifiableCredential;
      const options = req.options;

      let issuerMembershipRegistry = issuerMembershipRegistryCache.get('issuerMembershipRegistry');
      if (!issuerMembershipRegistry) {
        issuerMembershipRegistry = (await axios.get(issuerMembershipRegistryUrl)).data.registry;
        issuerMembershipRegistryCache.set('issuerMembershipRegistry', issuerMembershipRegistry);
      }
      const verificationResult = await verify({verifiableCredential, issuerMembershipRegistry});
      reply
        .code(200)
        .header('Content-Type', 'application/json; charset=utf-8')
        .send(verificationResult);
    }
  )

  server.post(
    '/verify/presentations', async (request, reply) => {
      const requestInfo: any = request.body;
      const verifiablePresentation = requestInfo.verifiablePresentation;
      const options = requestInfo.options;

      let issuerMembershipRegistry = issuerMembershipRegistryCache.get('issuerMembershipRegistry');
      if (!issuerMembershipRegistry) {
        issuerMembershipRegistry = (await axios.get(issuerMembershipRegistryUrl)).data.registry;
        issuerMembershipRegistryCache.set('issuerMembershipRegistry', issuerMembershipRegistry);
      }
      const verificationResult = await verifyPresentation({verifiablePresentation, issuerMembershipRegistry, options});
      reply
        .code(200)
        .header('Content-Type', 'application/json; charset=utf-8')
        .send(verificationResult);
    }
  )

  server.post(
    '/request/democredential/nodidproof', async (request, reply) => {
      if (!demoIssuerMethod) {
        throw new Error('Demo credential issuance is not supported');
      }

      const requestInfo: any = request.body;
      const verifiablePresentation = requestInfo;
      const holder = verifiablePresentation.holder;

      const options = {
        "verificationMethod": demoIssuerMethod!,
      }

      const demoCredential = constructDemoCredential(holder);
      const result = await sign(demoCredential, options);
      reply
        .code(201)
        .header('Content-Type', 'application/json; charset=utf-8')
        .send(result);
    }

  )

  server.post(
    '/request/democredential', async (request, reply) => {
      if (!demoIssuerMethod) {
        throw new Error('Demo credential issuance is not supported');
      }
      const requestInfo: any = request.body;
      const verifiablePresentation = requestInfo;
      const holder = verifiablePresentation.holder;
      // just use the challenge provided in the payload for demos
      const challenge = verifiablePresentation?.proof?.challenge;

      const options = {
        "challenge": challenge
      };

      const verificationResult = await verifyPresentation({verifiablePresentation, issuerMembershipRegistry, options});
      if (verificationResult.verified) {

        const demoCredential = constructDemoCredential(holder);
        const options = {
          "verificationMethod": demoIssuerMethod!,
        }
        const result = await sign(demoCredential, options);
        reply
          .code(201)
          .header('Content-Type', 'application/json; charset=utf-8')
          .send(result);
      } else {
        reply
          .code(500)
          .send({ message: 'Could not validate request', error: verificationResult });
      }

    }
  )

  // DO NOT DELETE: Allows clients to generate test payloads
  server.post(
    '/generate/controlproof', async (request, reply) => {
        const req: any = request.body;
        const { presentationId, holder, ...options } = req;

        const result = await createAndSignPresentation(null, presentationId, holder, options);

        reply
            .code(201)
            .header('Content-Type', 'application/json; charset=utf-8')
            .send(result);
    }
)

  server.post('/validation/cred-check', async (request, reply) => {
    const error: { code: string; description: string } = {
      code: 'customCode',
      description: 'subject error'
    };
    const timeOfWaiting = (): number => {
      return Math.floor(Math.random() * (4000 - 2000)) + 2000;
    };
    setTimeout(() => {
      reply
        .code(200)
        .header('Content-Type', 'application/json; charset=utf-8')
        .send([
          { key: 'subject', error },
          { key: 'issuer', error: null },
          { key: 'issuanceDate', error: null },
        ]);
    }, timeOfWaiting())
  });

  server.post('/validation/proof', async (request, reply) => {
    const error: { code: string; description: string } = {
      code: 'customCode',
      description: 'metadata error'
    };
    const timeOfWaiting = (): number => {
      return Math.floor(Math.random() * (4000 - 2000)) + 2000;
    };
    setTimeout(() => {
      reply
        .code(200)
        .header('Content-Type', 'application/json; charset=utf-8')
        .send([
          { key: 'metadata', error },
          { key: 'isCorrectKey', error: null },
          { key: 'isCorrectSignature', error: null },
          { key: 'proofPurpose', error: null },
        ]);
    }, timeOfWaiting())
  });

  server.post('/validation/final-check', async (request, reply) => {
    const error: { code: string; description: string } = {
      code: 'customCode',
      description: 'expiration error'
    };
    const timeOfWaiting = (): number => {
      return Math.floor(Math.random() * (4000 - 2000)) + 2000;
    };
    setTimeout(() => {
      reply
        .code(200)
        .header('Content-Type', 'application/json; charset=utf-8')
        .send([
          { key: 'expiration', error },
          { key: 'status', error: null },
          { key: 'fitnessForPurpose', error: null }
        ]);
    }, timeOfWaiting())
  });

  return server
}
