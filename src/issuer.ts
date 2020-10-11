import jsonld from "jsonld";
import { JsonWebKey, JsonWebSignature2020 } from "@transmute/json-web-signature-2020";
import vc from "vc-js";
import { PublicKey } from "./types";
import { Config, getConfig } from "./config";

export function getController(fullDid: string) {
  return fullDid.split('#')[0];
}

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
      date: date
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

    try {
      let valid = await vc.verifyCredential({
        credential: { ...verifiableCredential },
        documentLoader: customLoader,
        expansionMap: !false,
        suite
      });
      return valid;
    }
    catch (e) {
      console.error(e);
      throw e;
    }
  }

  async function sign(credential: any, options: any) {
    const assertionMethod = options.assertionMethod;
    const suite = createSuite(assertionMethod);

    try {
      let result = await vc.issue({
        credential: credential,
        documentLoader: customLoader,
        expansionMap: false,
        suite
      });
      return result;
    } catch (e) {
      console.error(e);
      throw e;
    }
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
