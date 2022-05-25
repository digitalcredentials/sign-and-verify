import { FastifyReply, FastifyRequest, HookHandlerDoneFunction } from 'fastify';
import httpSignature from 'http-signature';
import { HttpSignatureError } from "http-signature/lib/utils";
import { getConfig } from './config';
import { createHash } from 'crypto';


export function verifyRequestDigest(request: FastifyRequest, reply: any, done: HookHandlerDoneFunction): void {
  const { digestCheck, digestAlorithms } = getConfig();

  if (!digestCheck) {
    return done();
  }

  const header = request.headers["digest"];
  if (typeof header !== "string") {
    return reply.badRequest("Exactly one 'Digest' header is required");
  }

  const splitIdx = header.indexOf("=");
  if (splitIdx === -1) {
    return reply.badRequest("Invalid 'Digest' header format");
  }

  const algorithm = header.substring(0, splitIdx);
  const value = header.substring(splitIdx + 1);

  if (!digestAlorithms.includes(algorithm)) {
    return reply.badRequest(`Digest header algorithm ${algorithm} not supported`);
  }

  const digest = Buffer.from(value, "base64");
  const computed = createHash(algorithm).update(request.rawBody).digest();
  if (!digest.equals(computed)) {
    return reply.badRequest(`Digest header does not match ${algorithm} hash of request body`);
  }

  done();
}

export function verifyRequestSignature(request: FastifyRequest, reply: any, done: HookHandlerDoneFunction): void {
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
  } catch(error) {
    if (error instanceof HttpSignatureError) {
      request.log.debug(error);
      return reply.badRequest(error.message);
    } else {
      request.log.error(error);
      return reply.internalServerError(error.message);
    }
  }

  if (!httpSignature.verifyHMAC(parsed, hmacSecret)) {
    // if the HMAC signal is invalid
    request.log.debug("HMAC signature is invalid");
    return reply.badRequest("Invalid request signature");
  }
  request.log.debug("HMAC signature is valid");
  done();
}
