import fastify from 'fastify';
import { getDefaultIssuer } from './issuer';
import { requestCredential } from './request';
import { getConfig } from "./config"

const { sign, verify } = getDefaultIssuer();

const server = fastify({
  logger: true
});

server.register(require('fastify-cors'), {

});
server.register(require('fastify-swagger'), {
  routePrefix: '/docs',
  mode: 'static',
  specification: {
    path: __dirname + '/vc-http-api-0.0.0.yaml'
  },
  exposeRoute: true
})
server.setErrorHandler(function (error, request, reply) {
  request.log.error(error);
  reply
    .code(500)
    .header('Content-Type', 'application/json; charset=utf-8')
    .send(error);
});


server.get('/status', async (request, reply) => {
  reply
    .code(200)
    .header('Content-Type', 'application/json; charset=utf-8')
    .send({ status: 'OK' });
});


server.post(
  '/issue/credentials', async (request, reply) => {
    const credential = request.body;
    //const options = requestBody['options'];
    const options = {
      verificationMethod: 'did:web:digitalcredentials.github.io#96K4BSIWAkhcclKssb8yTWMQSz4QzPWBy-JsAFlwoIs'
    };

    const result = await sign(credential, options);
    reply
      .code(201)
      .header('Content-Type', 'application/json; charset=utf-8')
      .send(result);
  }
)

server.post(
  '/verify/credentials', async (request, reply) => {
    const credential = request.body;
    //const options = requestBody['options'];
    const options = {
      verificationMethod: 'did:web:digitalcredentials.github.io#96K4BSIWAkhcclKssb8yTWMQSz4QzPWBy-JsAFlwoIs'
    };

    const result = await verify(credential, options);
    reply
      .code(201)
      .header('Content-Type', 'application/json; charset=utf-8')
      .send(result);
  }
)

server.post(
  '/request/credentials', async (request, reply) => {
    const requestInfo = request.body;

    const result = await requestCredential(requestInfo);
    reply
      .code(201)
      .header('Content-Type', 'application/json; charset=utf-8')
      .send(result);
  }
)


server.listen(getConfig().port, '::', (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${address}`)
});
