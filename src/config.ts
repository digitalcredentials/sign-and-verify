import { ConfigurationError } from './errors';
import { credentialRequestHandler } from './issuer-helper';

export type Config = {
  port: number,
  didSeed: string;
  hmacSecret: string | null,
  hmacRequiredHeaders: Array<string>,
  digestCheck: boolean,
  digestAlorithms: Array<string>,
  demoIssuerMethod: string | null,
  issuerMembershipRegistryUrl: string,
  credentialRequestHandler: (issuerId: string, holderId: string, idToken: string) => Promise<any>;
}

let CONFIG: null | Config = null;

export function parseConfig(): Config {
  if (!process.env.DID_SEED) {
    throw new ConfigurationError("Environment variable 'DID_SEED' is not set");
  }
  return Object.freeze({
    port: process.env.PORT ? Number(process.env.PORT) : 5000,
    didSeed: process.env.DID_SEED,
    hmacSecret: process.env.HMAC_SECRET || null,
    hmacRequiredHeaders: (
      process.env.HMAC_REQUIRED_HEADERS || "date,digest"
    ).split(",").map((header) => header.trim()),
    digestCheck: process.env.DIGEST_CHECK?.toLowerCase() === 'true',
    digestAlorithms: (
      process.env.DIGEST_ALGORITHMS || "SHA256,SHA512"
    ).split(",").map((alg) => alg.trim()),
    demoIssuerMethod : process.env.DEMO_ISSUER_METHOD || null,
    issuerMembershipRegistryUrl: process.env.ISSUER_MEMBERSHIP_REGISTRY_URL || 'https://digitalcredentials.github.io/issuer-registry/registry.json',
    credentialRequestHandler: credentialRequestHandler
  });
}

export function resetConfig() {
  CONFIG = null;
}

export function getConfig(): Config {
  if (!CONFIG) {
    CONFIG = parseConfig();
  }
  return CONFIG;
}
