import { createHash } from 'crypto';
import { FastifyReply, FastifyRequest, HookHandlerDoneFunction } from 'fastify';
import httpSignature from 'http-signature';
import { HttpSignatureError } from 'http-signature/lib/utils';
import { getConfig } from './config';
import { BaseCredentialStatusClient } from './credential-status';

// Signature of hook function
type HookFunction = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

// Extract access token from request header
export function extractAccessToken(headers): string | undefined {
  if (!headers.authorization) {
    return;
  }
  const [scheme, token] = headers.authorization.split(' ');
  if (scheme === 'Bearer') {
    return token;
  }
}

// Verify request request digest
export function verifyRequestDigest(request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction): void {
  const { digestCheck, digestAlorithms } = getConfig();

  if (!digestCheck) {
    return done();
  }

  const header = request.headers["digest"];
  if (typeof header !== "string") {
    reply.status(400).send("Exactly one 'Digest' header is required");
    return;
  }

  const splitIdx = header.indexOf("=");
  if (splitIdx === -1) {
    reply.status(400).send("Invalid 'Digest' header format");
    return;
  }

  const algorithm = header.substring(0, splitIdx);
  const value = header.substring(splitIdx + 1);

  if (!digestAlorithms.includes(algorithm)) {
    reply.status(400).send(`Digest header algorithm ${algorithm} not supported`);
    return;
  }

  const digest = Buffer.from(value, "base64");
  const computed = createHash(algorithm).update(request.rawBody).digest();
  if (!digest.equals(computed)) {
    reply.status(400).send(`Digest header does not match ${algorithm} hash of request body`);
    return;
  }

  done();
}

// Verify request signature
export function verifyRequestSignature(request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction): void {
  const { hmacSecret, hmacRequiredHeaders } = getConfig();
  if (!hmacSecret) {
    request.log.debug("Skipped HMAC validation");
    // No HMAC secret is configured, so allow all requests through
    return done();
  }
  let parsed;
  try {
    parsed = httpSignature.parseRequest(request, {
      headers: hmacRequiredHeaders
    });
  } catch(error: any) {
    if (error instanceof HttpSignatureError) {
      request.log.debug(error);
      reply.status(400).send(error.message);
      return;
    } else {
      request.log.error(error);
      reply.status(500).send(error.message);
      return;
    }
  }

  if (!httpSignature.verifyHMAC(parsed, hmacSecret)) {
    // if the HMAC signal is invalid
    request.log.debug("HMAC signature is invalid");
    reply.status(400).send("Invalid request signature");
    return;
  }
  request.log.debug("HMAC signature is valid");
  done();
}

// Verify whether issuer client has access to status repo
export function verifyStatusRepoAccess(credStatusClient: BaseCredentialStatusClient): HookFunction {
  const verifyStatusRepoAccessHook = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const { headers } = request;
    // Verify that access token was included in request
    const accessToken = extractAccessToken(headers);
    if (!accessToken) {
      reply
        .code(401)
        .send({ message: 'Failed to provide access token in request' });
      return;
    }
    // Check if issuer client has access to status repo
    const hasAccess = await credStatusClient.hasStatusRepoAccess(accessToken);
    if (!hasAccess) {
      reply
        .code(403)
        .send({ message: 'Issuer is unauthorized to access status repo' });
      return;
    }
  };
  return verifyStatusRepoAccessHook;
};