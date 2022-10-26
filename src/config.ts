import { ConfigurationError } from './errors';
import { AuthType } from './issuer';
import { decodeSecretKeySeed } from '@digitalcredentials/bnid';

export type Config = {
  port: number;
  enableHttpsForDev: boolean;
  authType: AuthType;
  didSeed: string;
  didWebUrl: string | undefined;
  oidcIssuerUrl: string | undefined;
  issuerMembershipRegistryUrl: string;
  demoIssuerMethod: string | null;
}

let CONFIG: null | Config = null;

export function parseConfig(): Config {
  if (!process.env.AUTH_TYPE) {
    throw new ConfigurationError("Environment variable 'AUTH_TYPE' is not set");
  }
  if (!process.env.DID_SEED) {
    throw new ConfigurationError("Environment variable 'DID_SEED' is not set");
  }
  if (!process.env.OIDC_ISSUER_URL) {
    throw new ConfigurationError("Environment variable 'OIDC_ISSUER_URL' is not set");
  }
  return Object.freeze({
    port: process.env.PORT ? Number(process.env.PORT) : 3000,
    enableHttpsForDev: process.env.ENABLE_HTTPS_FOR_DEV?.toLowerCase() === 'true',
    authType: process.env.AUTH_TYPE as AuthType,
    didSeed: process.env.DID_SEED,
    didWebUrl: process.env.DID_WEB_URL,
    oidcIssuerUrl: process.env.OIDC_ISSUER_URL,
    issuerMembershipRegistryUrl: process.env.ISSUER_MEMBERSHIP_REGISTRY_URL || 'https://digitalcredentials.github.io/issuer-registry/registry.json',
    demoIssuerMethod : process.env.DEMO_ISSUER_METHOD || null
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

export function decodeSeed(secretKeySeed: string): Uint8Array {
  let secretKeySeedBytes: Uint8Array;
  if (secretKeySeed.startsWith('z')) {
    // This is a multibase-decoded key seed, such as that generated via @digitalcredentials/did-cli
    secretKeySeedBytes = decodeSecretKeySeed({secretKeySeed});
  } else if (secretKeySeed.length >= 32) {
      secretKeySeedBytes = (new TextEncoder()).encode(secretKeySeed).slice(0, 32);
  } else {
    throw TypeError('"secretKeySeed" must be at least 32 bytes, preferably multibase-encoded.');
  }

  return secretKeySeedBytes;
}
