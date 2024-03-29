import { expect, assert } from 'chai';
import { createSandbox } from 'sinon';
import 'mocha';

import { parseConfig, getConfig, resetConfig, Config } from '../config';
import { AuthType } from '../issuer';
import { ConfigurationError } from '../errors';

const sandbox = createSandbox();

const authType = AuthType.OidcToken;
const didSeed = "DsnrHBHFQP0ab59dQELh3uEwy7i5ArcOTwxkwRO2hM87CBRGWBEChPO7AjmwkAZ2";
const didWebUrl = "https://vc-issuer.example.com";
const oidcIssuerUrl = "https://oidc-issuer.example.com";
const issuerMembershipRegistryUrl = "https://digitalcredentials.github.io/issuer-registry/registry.json";
const expectedConfig: Config = {
  port: 3000,
  authType,
  didSeed,
  didWebUrl,
  oidcIssuerUrl,
  issuerMembershipRegistryUrl,
  enableHttpsForDev: false,
  demoIssuerMethod: null
};
const validEnv = {
  AUTH_TYPE: authType,
  DID_SEED: didSeed,
  DID_WEB_URL: didWebUrl,
  OIDC_ISSUER_URL: oidcIssuerUrl,
  ISSUER_MEMBERSHIP_REGISTRY_URL: issuerMembershipRegistryUrl
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

    it("should throw an exception if env.OIDC_ISSUER_URL isn't set", () => {
      sandbox.stub(process, "env").value({ AUTH_TYPE: authType, DID_SEED: didSeed });
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
