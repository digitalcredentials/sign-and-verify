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
    //assertionMethod: string, date = new Date().toISOString()
    const signingKey = createJwk(getSigningKeyIdentifier(options));
    const signatureSuite = new JsonWebSignature2020({
      key: signingKey,
      date: getSigningDate(options)
    });
    return signatureSuite;
  }

  async function verify(verifiableCredential: any, options: SignatureOptions) {
    // TODO: doesn't need private
    const suite = createSuite(options);
    const controller = getController(options.verificationMethod!);

    // preload docs for docLoader
    // TODO: needs to be private
    preloadedDocs[controller] = unlockedDid;
    preloadedDocs[options.verificationMethod!] = unlockedDid;

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

    // https://github.com/digitalbazaar/vc-js/blob/b5985f8e28a4cf60ac8933b47ba1cbd576de7b68/lib/vc.js
  // TODO: assertion method
  async function createAndSignPresentation(credential: any, options: SignatureOptions) {
 //   assertionMethod: any, challenge: string) {
    const suite = createSuite(options);
    const controller = getController(options.verificationMethod!);

    const presentation = {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      "type": "VerifiablePresentation",
      "holder": controller,
    }

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
    const controller = getController(options.verificationMethod!);
  
    // preload docs for docLoader
    // TODO
    preloadedDocs[controller] = unlockedDid;
    preloadedDocs[options.verificationMethod!] = unlockedDid;
  
    // verify
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
