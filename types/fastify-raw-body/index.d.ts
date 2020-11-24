
import fastify = require("fastify");

declare module "fastify" {
  interface FastifyRequest {
    rawBody: string;
  }
}

export type RawBodyOptions = {
  field: string,
  encoding: string,
  global: boolean,
  runFirst: boolean
}

export const fastifyRawBody: FastifyPlugin<RawBodyOptions>;

export default fastifyRawBody;
