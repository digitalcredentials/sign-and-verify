import { decodeSecretKeySeed } from '@digitalcredentials/bnid';
import { CredentialStatusClientType, VisibilityLevel } from './credential-status';
import { ConfigurationError } from './errors';
import { AuthType } from './issuer';

export type Config = {
  port: number;
  authType: AuthType;
  didSeed: string;
  didWebUrl: string | undefined;
  vcApiIssuerUrl: string;
  oidcIssuerUrl: string | undefined;
  issuerMembershipRegistryUrl: string;
  credStatusClientType: CredentialStatusClientType;
  credStatusClientAccessToken: string;
  credStatusRepoName: string;
  credStatusRepoOrgName: string;
  credStatusRepoOrgId: string;
  credStatusRepoVisibility: VisibilityLevel;
  hmacSecret: string | null;
  hmacRequiredHeaders: Array<string>;
  digestCheck: boolean;
  digestAlorithms: Array<string>;
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
  if (!process.env.URL) {
    throw new ConfigurationError("Environment variable 'URL' is not set");
  }
  if (!process.env.OIDC_ISSUER_URL) {
    throw new ConfigurationError("Environment variable 'OIDC_ISSUER_URL' is not set");
  }
  switch (process.env.CRED_STATUS_CLIENT_TYPE as CredentialStatusClientType) {
    case CredentialStatusClientType.Gitlab:
      assureGitlabClientConfigured();
      break;
    case CredentialStatusClientType.Github:
      assureGithubClientConfigured();
      break;
  }

  return Object.freeze({
    port: process.env.PORT ? Number(process.env.PORT) : 5000,
    authType: process.env.AUTH_TYPE as AuthType,
    didSeed: process.env.DID_SEED,
    didWebUrl: process.env.DID_WEB_URL,
    vcApiIssuerUrl: process.env.URL,
    oidcIssuerUrl: process.env.OIDC_ISSUER_URL,
    issuerMembershipRegistryUrl: process.env.ISSUER_MEMBERSHIP_REGISTRY_URL || 'https://digitalcredentials.github.io/issuer-registry/registry.json',
    credStatusClientType: process.env.CRED_STATUS_CLIENT_TYPE as CredentialStatusClientType || CredentialStatusClientType.Github,
    credStatusClientAccessToken: process.env.CRED_STATUS_CLIENT_ACCESS_TOKEN || '',
    credStatusRepoName: process.env.CRED_STATUS_REPO_NAME || 'credential-status',
    credStatusRepoOrgName: process.env.CRED_STATUS_REPO_ORG_NAME || '',
    credStatusRepoOrgId: process.env.CRED_STATUS_REPO_ORG_ID || '',
    credStatusRepoVisibility: process.env.CRED_STATUS_REPO_VISIBILITY as VisibilityLevel || VisibilityLevel.Public,
    hmacSecret: process.env.HMAC_SECRET || null,
    hmacRequiredHeaders: (
      process.env.HMAC_REQUIRED_HEADERS || "date,digest"
    ).split(",").map((header) => header.trim()),
    digestCheck: process.env.DIGEST_CHECK?.toLowerCase() === 'true',
    digestAlorithms: (
      process.env.DIGEST_ALGORITHMS || "SHA256,SHA512"
    ).split(",").map((alg) => alg.trim()),
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

function assureGithubClientConfigured() {
  const githubVariables = ['CRED_STATUS_CLIENT_ACCESS_TOKEN', 'CRED_STATUS_REPO_ORG_NAME'];
  const isGithubClientProperlyConfigured = githubVariables.every((variable) => {
    return !!process.env[variable];
  });
  if (!isGithubClientProperlyConfigured) {
    throw new ConfigurationError(`The following environment variables must be set for the GitHub credential status client: ${githubVariables.join(', ')}`);
  }
}

function assureGitlabClientConfigured() {
  const gitlabVariables = ['CRED_STATUS_CLIENT_ACCESS_TOKEN', 'CRED_STATUS_REPO_ORG_NAME', 'CRED_STATUS_REPO_ORG_ID'];
  const isGitlabClientProperlyConfigured = gitlabVariables.every((variable) => {
    return !!process.env[variable];
  });
  if (!isGitlabClientProperlyConfigured) {
    throw new ConfigurationError(`The following environment variables must be set for the GitLab credential status client: ${gitlabVariables.join(', ')}`);
  }
}