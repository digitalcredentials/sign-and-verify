import { DIDDocument } from "./types"

export type Config = {
  port: number,
  unlockedDid: DIDDocument
}

let CONFIG: null | Config = null;

export function parseConfig(): Config {
  return Object.freeze({
    port: process.env.PORT ? Number(process.env.PORT) : 5000,
    unlockedDid: process.env.UNLOCKED_DID ? JSON.parse(
      Buffer.from(process.env.UNLOCKED_DID, "base64").toString("ascii")
    ): null
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
