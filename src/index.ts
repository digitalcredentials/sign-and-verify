import fastify from 'fastify';
import { createJwk, sign } from './issuer';

const server = fastify();

const port = process.env['port'] ? Number(process.env['port']) : 5000;

server.register(require('fastify-cors'), { 

})

server.get('/ping', async (request, reply) => {
  const key = createJwk('did:example:123#96K4BSIWAkhcclKssb8yTWMQSz4QzPWBy-JsAFlwoIs');
  return `pong ${key.id}\n`
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

server.listen(port, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${address}`)
});
