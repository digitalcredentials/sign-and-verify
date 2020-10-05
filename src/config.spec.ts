import { expect } from 'chai';
import { createSandbox } from "sinon";
import 'mocha';

import { parseConfig, getConfig, resetConfig } from "./config";
import { readFileSync } from 'fs';

const sandbox = createSandbox();

describe("config", () => {
  beforeEach(() => {
    resetConfig();
  });
  afterEach(() => {
    sandbox.restore();
  });

  describe("#parseConfig()", () => {
    it("should use defaults if no environment variables set", () => {
      sandbox.stub(process, "env").value({});
      expect(parseConfig()).to.deep.equal({
        port: 5000,
        unlockedDid: null
      });
    });

    it("should parseConfig the port number", () => {
      sandbox.stub(process, "env").value({
        PORT: "6739"
      });
      expect(parseConfig()).to.deep.equal({
        port: 6739,
        unlockedDid: null
      });
    });

    it("should decode and parseConfig the unlocked DID", () => {
      const unlockedDid = readFileSync("data/unlocked-did:web:digitalcredentials.github.io.json");
      sandbox.stub(process, "env").value({
        UNLOCKED_DID: unlockedDid.toString("base64")
      });
      expect(parseConfig()).to.deep.equal({
        port: 5000,
        unlockedDid: JSON.parse(unlockedDid.toString("ascii"))
      });
    });
  });

  describe("#getConfig()", () => {
    it("only calls parseConfig() once", () => {
      sandbox.stub(process, "env").value({});
      expect(getConfig()).to.deep.equal({
        port: 5000,
        unlockedDid: null
      });
      // specify a new port to test that this isn't re-parseConfigd
      sandbox.stub(process, "env").value({
        PORT: "6739"
      });
      expect(getConfig()).to.deep.equal({
        port: 5000,
        unlockedDid: null
      });
    });
  });
});
