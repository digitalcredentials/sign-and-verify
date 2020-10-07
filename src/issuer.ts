import jsonld from "jsonld";
import { JsonWebKey, JsonWebSignature2020 } from "@transmute/json-web-signature-2020";
import vc from "vc-js";
import { PublicKey } from "./types";
import { Config, getConfig } from "./config";


async function signCore(credJson: any, suite: any, customLoader: any = undefined, testMode = true) {
  try {
    let result = await vc.issue({
      credential: credJson,
      documentLoader: customLoader,
      expansionMap: !testMode,
      suite
    });
    return result;
  } catch (e) {
    console.error(e);
    throw e;
  }
}

async function verifyCore(result: any, suite: any, customLoader: any, testMode = true) {
  try {
    let valid = await vc.verifyCredential({
      credential: { ...result },
      documentLoader: customLoader,
      expansionMap: !testMode,
      suite
    });
    return valid;
  }
  catch (e) {
    console.error(e);
    throw e;
  }
}


export function getController(fullDid: string) {
  return fullDid.split('#')[0];
}

// sample options
/*
const options = {
  created: new Date().toISOString(),
  proofPurpose: 'assertionMethod',
  assertionMethod: assertionMethod
};*/


export function createIssuer(config: Config) {
  const preloadedDocs: { [key: string]: any; } = {};
  const unlockedDid = config.unlockedDid
  const unlockedAssertionMethods = new Map<string, PublicKey>([
    [unlockedDid.publicKey[0].id, unlockedDid.publicKey[0]]
  ]);

  const customLoader = (url: string) => {
    const context = preloadedDocs[url];
    if (context) {
      return {
        contextUrl: null, // this is for a context via a link header
        document: context, // this is the actual document that was loaded
        documentUrl: url // this is the actual contxt URL after redirects
      };
    }
    return jsonld.documentLoaders.node()(url);
  };

  function createJwk(assertionMethod: string) {
    const keyInfo: any = unlockedAssertionMethods.get(assertionMethod);
    return new JsonWebKey(keyInfo);
  }

  function createSuite(assertionMethod: string, date = new Date().toISOString()) {
    const signingKey = createJwk(assertionMethod);
    const signatureSuite = new JsonWebSignature2020({
      key: signingKey,
      date:  date
    });
    return signatureSuite;
  }

  async function verify(verifiableCredential: any, options: any) {
    const assertionMethod = options.assertionMethod;
    const suite = createSuite(assertionMethod);
    const controller = getController(assertionMethod);

    // preload docs for docLoader
    // TODO: needs to be private
    preloadedDocs[controller] = unlockedDid;
    preloadedDocs[assertionMethod] = unlockedDid;

    // verify
    return verifyCore(verifiableCredential, suite, customLoader, true);
  }

  async function sign(credential: any, options: any) {
    const assertionMethod = options.assertionMethod;
    const suite = createSuite(assertionMethod);
    const controller = getController(assertionMethod);
    // update issuer id
    if (credential['issuer'] && credential.issuer['id']) {
      credential.issuer.id = controller;
    } else {
      credential.issuer = controller;
    }

    // add issuanceDate if not provided
    if (!credential.issuanceDate) {
      credential.issuanceDate = new Date().toISOString();
    }

    // sign
    return signCore(credential, suite, customLoader);

    // TODO: created vs issuanceDate, domain, challenge
    // TODO: verification vs assertion method

    /*
    "verificationMethod": "did:example:123#z6MksHh7qHWvybLg5QTPPdG2DgEjjduBDArV9EF9mRiRzMBN",
    "proofPurpose": "assertionMethod",
    "created": "2020-04-02T18:48:36Z",
    "domain": "example.com",
    "challenge": "d436f0c8-fbd9-4e48-bbb2-55fc5d0920a8"
  */
  }

  return {
    createJwk,
    createSuite,
    verify,
    sign
  }
}


export function getDefaultIssuer() {
  return createIssuer(getConfig())
}
