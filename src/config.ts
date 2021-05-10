import { DIDDocument } from "@digitalcredentials/sign-and-verify-core";
import { ConfigurationError } from "./errors";

export type Config = {
  port: number,
  unlockedDid: DIDDocument,
  hmacSecret: string | null,
  hmacRequiredHeaders: Array<string>,
  digestCheck: boolean,
  digestAlorithms: Array<string>,
  demoIssuerMethod: string | null
}

let CONFIG: null | Config = null;

export function parseConfig(): Config {
  if (!process.env.UNLOCKED_DID) {
    throw new ConfigurationError("Environment variable 'UNLOCKED_DID' is not set");
  }
  return Object.freeze({
    port: process.env.PORT ? Number(process.env.PORT) : 5000,
    unlockedDid: JSON.parse(
      Buffer.from(process.env.UNLOCKED_DID, "base64").toString("ascii")
    ),
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
