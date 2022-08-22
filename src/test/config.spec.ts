import { expect, assert } from 'chai';
import { createSandbox } from 'sinon';
import 'mocha';

import { parseConfig, getConfig, resetConfig, Config } from '../config';
import { CredentialStatusClientType, VisibilityLevel } from '../credential-status';
import { ConfigurationError } from '../errors';
import { AuthType } from '../issuer';

const sandbox = createSandbox();

const authType = AuthType.OidcToken;
const didSeed = "DsnrHBHFQP0ab59dQELh3uEwy7i5ArcOTwxkwRO2hM87CBRGWBEChPO7AjmwkAZ2";
const didWebUrl = "https://vc-issuer.example.com";
const oidcIssuerUrl = "https://oidc-issuer.example.com";
const vcApiIssuerUrlHost = "vc-issuer.example.com";
const vcApiIssuerUrlProtocol = "https";
const issuerMembershipRegistryUrl = "https://digitalcredentials.github.io/issuer-registry/registry.json";
const credStatusClientType = CredentialStatusClientType.Github;
const credStatusClientAccessToken = "abc";
const credStatusRepoName = "credential-status";
const credStatusRepoOrgName = "university-xyz";
const credStatusRepoOrgId = "87654321";
const credStatusRepoVisibility = VisibilityLevel.Public;
const expectedConfig: Config = {
  port: 5000,
  authType,
  didSeed,
  didWebUrl,
  oidcIssuerUrl,
  vcApiIssuerUrlHost,
  vcApiIssuerUrlProtocol,
  issuerMembershipRegistryUrl,
  credStatusClientType,
  credStatusClientAccessToken,
  credStatusRepoName,
  credStatusRepoOrgName,
  credStatusRepoOrgId,
  credStatusRepoVisibility,
  hmacSecret: null,
  hmacRequiredHeaders: ["date", "digest"],
  digestCheck: false,
  digestAlorithms: ["SHA256", "SHA512"],
  demoIssuerMethod: null
};
const validEnv = {
  AUTH_TYPE: authType,
  DID_SEED: didSeed,
  DID_WEB_URL: didWebUrl,
  OIDC_ISSUER_URL: oidcIssuerUrl,
  VC_API_ISSUER_URL_HOST: vcApiIssuerUrlHost,
  VC_API_ISSUER_URL_PROTOCOL: vcApiIssuerUrlProtocol,
  ISSUER_MEMBERSHIP_REGISTRY_URL: issuerMembershipRegistryUrl,
  CRED_STATUS_CLIENT_TYPE: credStatusClientType,
  CRED_STATUS_CLIENT_ACCESS_TOKEN: credStatusClientAccessToken,
  CRED_STATUS_REPO_NAME: credStatusRepoName,
  CRED_STATUS_REPO_ORG_NAME: credStatusRepoOrgName,
  CRED_STATUS_REPO_ORG_ID: credStatusRepoOrgId,
  CRED_STATUS_REPO_VISIBILITY: credStatusRepoVisibility
};

describe("config", () => {
  beforeEach(() => {
    sandbox.stub(process, "env").value(validEnv);
    resetConfig();
  });
  afterEach(() => {
    sandbox.restore();
  });

  describe("#parseConfig()", () => {
    it("should use defaults if optional variables not set", () => {
      expect(parseConfig()).to.deep.equal(expectedConfig);
    });

    it("should parse env.PORT", () => {
      sandbox.stub(process, "env").value({
        ...validEnv,
        PORT: "6739"
      });
      expect(parseConfig()).to.deep.equal({
        ...expectedConfig,
        port: 6739,
      });
    });

    it("should parse env.HMAC_SECRET", () => {
      const hmacSecret = "abc123";
      sandbox.stub(process, "env").value({
        ...validEnv,
        HMAC_SECRET: hmacSecret
      });
      expect(parseConfig()).to.deep.equal({
        ...expectedConfig,
        hmacSecret
      });
    });

    it("should parse env.HMAC_REQUIRED_HEADERS", () => {
      sandbox.stub(process, "env").value({
        ...validEnv,
        HMAC_REQUIRED_HEADERS: "abc,def, gher, asf"
      });
      expect(parseConfig()).to.deep.equal({
        ...expectedConfig,
        hmacRequiredHeaders: ["abc", "def", "gher", "asf"],
      });
    });

    ;[
      ['true', true],
      ['True', true],
      ['TRUE', true],
      ['false', false],
      ['123', false],
      ['', false],
      [undefined, false],
    ].forEach(([value, expected]) => {
      it(`should parse env.DIGEST_CHECK with value=${value}`, () => {
        sandbox.stub(process, "env").value({
          ...validEnv,
          DIGEST_CHECK: value,
        });
        expect(parseConfig()).to.deep.equal({
          ...expectedConfig,
          digestCheck: expected
        });
      });
    });

    it("should parse env.DIGEST_ALGORITHMS", () => {
      sandbox.stub(process, "env").value({
        ...validEnv,
        HMAC_REQUIRED_HEADERS: "abc,def, gher, asf"
      });
      expect(parseConfig()).to.deep.equal({
        ...expectedConfig,
        hmacRequiredHeaders: ["abc", "def", "gher", "asf"],
      });
    });

    it("should parse env.DEMO_ISSUER_METHOD", () => {
      sandbox.stub(process, "env").value({
        ...validEnv,
        DEMO_ISSUER_METHOD: "did:example:123#abc"
      });
      expect(parseConfig()).to.deep.equal({
        ...expectedConfig,
        demoIssuerMethod: "did:example:123#abc"
      });
    });

    it("should throw an exception if env.AUTH_TYPE isn't set", () => {
      sandbox.stub(process, "env").value({});
      assert.throws(parseConfig, ConfigurationError, "Environment variable 'AUTH_TYPE' is not set");
    });

    it("should throw an exception if env.DID_SEED isn't set", () => {
      sandbox.stub(process, "env").value({ AUTH_TYPE: authType });
      assert.throws(parseConfig, ConfigurationError, "Environment variable 'DID_SEED' is not set");
    });

    it("should throw an exception if env.URL isn't set", () => {
      sandbox.stub(process, "env").value({ AUTH_TYPE: authType, DID_SEED: didSeed });
      assert.throws(parseConfig, ConfigurationError, "Environment variable 'VC_API_ISSUER_URL_HOST' is not set");
    });

    it("should throw an exception if env.OIDC_ISSUER_URL isn't set", () => {
      sandbox.stub(process, "env").value({ AUTH_TYPE: authType, DID_SEED: didSeed, VC_API_ISSUER_URL_HOST: vcApiIssuerUrlHost });
      assert.throws(parseConfig, ConfigurationError, "Environment variable 'OIDC_ISSUER_URL' is not set");
    });
  });

  describe("#getConfig()", () => {
    it("only calls parseConfig() once", () => {
      expect(getConfig()).to.deep.equal(expectedConfig);
      // specify a new port to test that this isn't re-parsed
      sandbox.stub(process, "env").value({
        ...validEnv,
        PORT: "6739"
      });
      expect(getConfig()).to.deep.equal(expectedConfig);
    });
  });
});
