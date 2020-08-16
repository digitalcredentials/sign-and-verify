import fastify from 'fastify';
import { sign, verify } from './issuer';
import { requestCredential } from './request';

const server = fastify();

const port = process.env['PORT'] ? Number(process.env['PORT']) : 5000;
const hostAddress = process.env['ADDRESS'] ? process.env['ADDRESS'] : '127.0.0.1';

server.register(require('fastify-cors'), { 

})

server.get('/ping', async (request, reply) => {
  return `pong\n`
});


server.post(
  '/issue/credentials', async (request, reply) => {
    const credential = request.body;
    //const options = requestBody['options'];
    const options = {
      assertionMethod: 'did:web:digitalcredentials.github.io#96K4BSIWAkhcclKssb8yTWMQSz4QzPWBy-JsAFlwoIs'
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
      assertionMethod: 'did:web:digitalcredentials.github.io#96K4BSIWAkhcclKssb8yTWMQSz4QzPWBy-JsAFlwoIs'
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


server.listen(port, hostAddress, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${address}`)
});
