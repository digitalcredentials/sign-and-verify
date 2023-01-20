import { decodeSecretKeySeed } from '@digitalcredentials/bnid';
import { CredentialStatusClientType, VisibilityLevel } from './credential-status';
import { ConfigurationError } from './errors';
import { AuthType } from './issuer';

export type Config = {
  port: number;
  enableHttpsForDev: boolean;
  authType: AuthType;
  didSeed: string;
  didWebUrl: string | undefined;
  oidcIssuerUrl: string | undefined;
  vcApiIssuerUrlHost: string;
  vcApiIssuerUrlProtocol: string;
  issuerMembershipRegistryUrl: string;
  credStatusClientType: CredentialStatusClientType;
  credStatusClientAccessToken: string;
  credStatusRepoName: string;
  credStatusMetaRepoName: string;
  credStatusRepoOrgName: string;
  credStatusRepoOrgId: string;
  credStatusRepoVisibility: VisibilityLevel;
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
  if (!process.env.VC_API_ISSUER_URL_HOST) {
    throw new ConfigurationError("Environment variable 'VC_API_ISSUER_URL_HOST' is not set");
  }
  if (!process.env.OIDC_ISSUER_URL) {
    throw new ConfigurationError("Environment variable 'OIDC_ISSUER_URL' is not set");
  }
  switch (process.env.CRED_STATUS_CLIENT_TYPE as CredentialStatusClientType) {
    case CredentialStatusClientType.Github:
      assureGithubClientConfigured();
      break;
    case CredentialStatusClientType.Gitlab:
      assureGitlabClientConfigured();
      break;
  }

  return Object.freeze({
    port: process.env.PORT ? Number(process.env.PORT) : 3000,
    enableHttpsForDev: process.env.ENABLE_HTTPS_FOR_DEV?.toLowerCase() === 'true',
    authType: process.env.AUTH_TYPE as AuthType,
    didSeed: process.env.DID_SEED,
    didWebUrl: process.env.DID_WEB_URL,
    oidcIssuerUrl: process.env.OIDC_ISSUER_URL,
    vcApiIssuerUrlHost: process.env.VC_API_ISSUER_URL_HOST,
    vcApiIssuerUrlProtocol: process.env.VC_API_ISSUER_URL_PROTOCOL || 'https',
    issuerMembershipRegistryUrl: process.env.ISSUER_MEMBERSHIP_REGISTRY_URL || 'https://digitalcredentials.github.io/issuer-registry/registry.json',
    credStatusClientType: process.env.CRED_STATUS_CLIENT_TYPE as CredentialStatusClientType || CredentialStatusClientType.Github,
    credStatusClientAccessToken: process.env.CRED_STATUS_CLIENT_ACCESS_TOKEN || '',
    credStatusRepoName: process.env.CRED_STATUS_REPO_NAME || 'credential-status',
    credStatusMetaRepoName: process.env.CRED_STATUS_META_REPO_NAME || 'credential-status-metadata',
    credStatusRepoOrgName: process.env.CRED_STATUS_REPO_ORG_NAME || '',
    credStatusRepoOrgId: process.env.CRED_STATUS_REPO_ORG_ID || '',
    credStatusRepoVisibility: process.env.CRED_STATUS_REPO_VISIBILITY as VisibilityLevel || VisibilityLevel.Public,
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
