import { createSandbox } from 'sinon';
import { createHmac, createHash } from "crypto";
import { expect } from 'chai';
import fastifyRawBody from 'fastify-raw-body';
import fastifyHttpSignature from 'http-signature';
import fastifySensible from 'fastify-sensible';
import fastify, { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import 'mocha';

import { verifyRequestSignature, verifyRequestDigest } from "../hooks";
import { resetConfig } from '../config';
import { AuthType } from '../issuer';

const sandbox = createSandbox();
const validEnv = {
  AUTH_TYPE: AuthType.OidcToken,
  DID_SEED: "DsnrHBHFQP0ab59dQELh3uEwy7i5ArcOTwxkwRO2hM87CBRGWBEChPO7AjmwkAZ2",
  URL: "https://vc-issuer.example.com",
  OIDC_ISSUER_URL: "https://oidc-issuer.example.com",
  DIGEST_CHECK: "true",
  HMAC_SECRET: "secret"
};

describe('hooks', () => {
  let server: FastifyInstance;

  const stubEnv = (env : any) => {
      sandbox.stub(process, "env").value(env);
      resetConfig();
  }

  beforeEach(() => {
    stubEnv(validEnv);
    server = fastify();
    server.register(fastifySensible);
  });
  afterEach(() => {
    sandbox.restore();
  });

  describe("#verifyRequestDigest", () => {

    beforeEach(() => {
      server.register(fastifyRawBody, {
        runFirst: true // get the body before any preParsing hook change/uncompress it.
      });
      server.post("/my/url", {
        preValidation: verifyRequestDigest
      }, (_request: FastifyRequest, reply:FastifyReply) => {
        reply
          .code(200)
          .send({
            ok: true
          });
      });
    });

    it("should allow the request if the digest check is disabled", async () => {
      sandbox.stub(process, "env").value({
        ...validEnv,
        DIGEST_CHECK: "false"
      });
      resetConfig();

      const response = await server.inject({
        method: "post",
        url: "/my/url",
      });

      expect(response.statusCode).to.be.equal(200);
      expect(JSON.parse(response.body)).to.be.deep.equal({
        ok: true
      });
    });

    it("should allow the request if the digest check passes", async () => {
      const payload = JSON.stringify({
        request: "test-request"
      });
      const digest = createHash("sha256")
        .update(payload)
        .digest()
        .toString("base64");
      const response = await server.inject({
        method: "post",
        url: "/my/url",
        headers: {
          "content-type": "application/json",
          digest: `SHA256=${digest}`
        },
        payload
      });

      expect(response.statusCode).to.be.equal(200);
      expect(JSON.parse(response.body)).to.be.deep.equal({
        ok: true
      });
    });


    it("should deny the request if the algorithm is invalid", async () => {
      const payload = JSON.stringify({
        request: "test-request"
      });
      const response = await server.inject({
        method: "post",
        url: "/my/url",
        headers: {
          "content-type": "application/json",
          digest: "INVALIDALG=abc"
        },
        payload
      });

      expect(response.statusCode).to.be.equal(400);
      expect(JSON.parse(response.body)).to.be.deep.equal({
        error: "Bad Request",
        statusCode: 400,
        message: "Digest header algorithm INVALIDALG not supported"
      });
    });

    it("should deny the request if the digest is an invalid format", async () => {
      const payload = JSON.stringify({
        request: "test-request"
      });
      const response = await server.inject({
        method: "post",
        url: "/my/url",
        headers: {
          "content-type": "application/json",
          digest: `invalid-value`
        },
        payload
      });

      expect(response.statusCode).to.be.equal(400);
      expect(JSON.parse(response.body)).to.be.deep.equal({
        error: "Bad Request",
        statusCode: 400,
        message: "Invalid 'Digest' header format"
      });
    });

    it("should deny the request if the digest header is missing", async () => {
      const payload = JSON.stringify({
        request: "test-request"
      });
      const response = await server.inject({
        method: "post",
        url: "/my/url",
        headers: {
          "content-type": "application/json",
        },
        payload
      });

      expect(response.statusCode).to.be.equal(400);
      expect(JSON.parse(response.body)).to.be.deep.equal({
        error: "Bad Request",
        statusCode: 400,
        message: "Exactly one 'Digest' header is required"
      });
    });

    it("should deny the request if the digest doesn't match", async () => {
      const payload = JSON.stringify({
        request: "test-request"
      });
      const digest = Buffer.from("invalid-digest").toString("base64");
      const response = await server.inject({
        method: "post",
        url: "/my/url",
        headers: {
          "content-type": "application/json",
          digest: `SHA256=${digest}`
        },
        payload
      });

      expect(response.statusCode).to.be.equal(400);
      expect(JSON.parse(response.body)).to.be.deep.equal({
        error: "Bad Request",
        statusCode: 400,
        message: "Digest header does not match SHA256 hash of request body"
      });
    });
  });

  describe("#verifyRequestSignature()", () => {
    beforeEach(() => {
      server.post("/my/url", {
        preValidation: verifyRequestSignature
      }, (_request: FastifyRequest, reply:FastifyReply) => {
        reply
          .code(200)
          .send({
            ok: true
          });
      });
    });

    it("should allow the request if there is no HMAC secret configured", async () => {
      sandbox.stub(process, "env").value({
        ...validEnv,
        HMAC_SECRET: null
      });
      resetConfig();

      const response = await server.inject({
        method: "post",
        url: "/my/url",
        headers: {
          date: "Date: Wed, 21 Oct 2015 07:28:00 GMT",
          digest: "arbitrary value",
          signature: "keyId=\"key-1\",algorithm=\"rsa-sha512\",headers=\"(request-target) date digest\",signature=\"aW52YWxpZAo=\""
        }
      });

      expect(response.statusCode).to.be.equal(200);
      expect(JSON.parse(response.body)).to.be.deep.equal({
        ok: true
      });
    });

    it("should allow a request with a valid signature header", async () => {
      const url = "/my/url";
      const digest = "request-digest";
      const date = new Date().toUTCString();
      const signature = createHmac("sha512", validEnv.HMAC_SECRET)
        .update(
          [
            `(request-target): post ${url}`,
            `date: ${date}`,
            `digest: ${digest}`,
          ].join("\n")
        )
        .digest()
        .toString("base64");
      const response = await server.inject({
        method: "post",
        url,
        headers: {
          date,
          digest,
          signature: `keyId="key-1",algorithm="hmac-sha512",headers="(request-target) date digest",signature="${signature}"`
        }
      });

      expect(response.statusCode).to.be.equal(200);
      expect(JSON.parse(response.body)).to.be.deep.equal({
        ok: true
      });
    });

    it("should fail a request with no signature header", async () => {
      const response = await server.inject({
        method: "post",
        url: "/my/url"
      });

      expect(response.statusCode).to.be.equal(400);
      expect(JSON.parse(response.body)).to.be.deep.equal({
        error: "Bad Request",
        statusCode: 400,
        message:"no authorization or signature header present in the request"
      });
    });

    it("should fail a request with headers that are part of the signature missing", async () => {
      const response = await server.inject({
        method: "post",
        url: "/my/url",
        headers: {
          "signature": "keyId=\"key-1\",algorithm=\"rsa-sha512\",headers=\"(request-target) date digest\",signature=\"aW52YWxpZAo=\""
        }
      });

      expect(response.statusCode).to.be.equal(400);
      expect(JSON.parse(response.body)).to.be.deep.equal({
        error: "Bad Request",
        statusCode: 400,
        message: "date was not in the request"
      });
    });

    it("should return a server 500 if there was an unexpected parsing error", async () => {
      const mock = sandbox.mock(fastifyHttpSignature);
      mock.expects("parseRequest").once().throws(new Error("error message"));
      const response = await server.inject({
        method: "post",
        url: "/my/url",
      });

      expect(response.statusCode).to.be.equal(500);
      expect(JSON.parse(response.body)).to.be.deep.equal({
        message: "error message",
        error: "Internal Server Error",
        statusCode: 500
      });
    });

    it("should fail a request with an invalid signature header", async () => {
      const response = await server.inject({
        method: "post",
        url: "/my/url",
        headers: {
          "date": new Date().toISOString(),
          "digest": "arbitrary value",
          "signature": "keyId=\"key-1\",algorithm=\"rsa-sha512\",headers=\"(request-target) date digest\",signature=\"aW52YWxpZAo=\""
        }
      });

      expect(response.statusCode).to.be.equal(400);
      expect(JSON.parse(response.body)).to.be.deep.equal({
        error: "Bad Request",
        statusCode: 400,
        message: "Invalid request signature"
      });
    });
  });
});
