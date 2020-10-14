import jsonld from "jsonld";
import { JsonWebKey, JsonWebSignature2020 } from "@transmute/json-web-signature-2020";
import vc from "vc-js";
import { PublicKey } from "./types";
import { Config, getConfig } from "./config";
import { SignatureOptions, getSigningKeyIdentifier, getSigningDate } from "./signatures";

export function getController(fullDid: string) {
  return fullDid.split('#')[0];
}

export function createIssuer(config: Config) {
  const preloadedDocs: { [key: string]: any; } = {};
  const unlockedDid = config.unlockedDid
  const unlockedAssertionMethods = new Map<string, PublicKey>([
    [unlockedDid.publicKey[0].id, unlockedDid.publicKey[0]]
  ]);

  // preload DIDs for docLoader
  // TODO: split between issuer and verifier, which doesn't need private
  preloadedDocs[config.unlockedDid.id] = unlockedDid;
  config.unlockedDid.publicKey.forEach((pk) => {
    preloadedDocs[pk.id] = unlockedDid;
  })

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

  function createSuite(options: SignatureOptions) {
    const signingKey = createJwk(getSigningKeyIdentifier(options));
    const signatureSuite = new JsonWebSignature2020({
      key: signingKey,
      date: getSigningDate(options)
    });
    return signatureSuite;
  }

  async function verify(verifiableCredential: any, options: SignatureOptions) {
    const suite = createSuite(options);
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

  async function sign(credential: any, options: SignatureOptions) {
    const suite = createSuite(options);
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

  async function createAndSignPresentation(credential: any, presentationId: string, holder: string, options: SignatureOptions) {
    const suite = createSuite(options);
    const presentation = vc.createPresentation({
      verifiableCredential: credential,
      id: presentationId,
      holder: holder
    });

    let result = await vc.signPresentation({
      presentation: presentation,
      documentLoader: customLoader,
      expansionMap: false,
      suite,
      challenge: options.challenge!
    });
    return result;
  }

  async function verifyPresentation(verifiablePresentation: any, options: SignatureOptions) {
    const suite = createSuite(options);

    let valid = await vc.verify({
      presentation: { ...verifiablePresentation },
      documentLoader: customLoader,
      challenge: options.challenge!,
      expansionMap: false,
      suite
    });
    return valid;
  }

  return {
    createJwk,
    createSuite,
    verify,
    sign,
    createAndSignPresentation,
    verifyPresentation
  }
}


export function getDefaultIssuer() {
  return createIssuer(getConfig())
}
