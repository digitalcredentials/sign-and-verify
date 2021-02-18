import fastify from 'fastify';
import fastifyRawBody from 'fastify-raw-body';
import fastifySensible from "fastify-sensible"
import { createIssuer } from '@digitalcredentials/sign-and-verify-core'
import { getConfig } from "./config";
import { verifyRequestDigest, verifyRequestSignature } from './hooks';

export function build(opts = {}) {

    const { unlockedDid } = getConfig();
    const { sign, verify, createAndSignPresentation, signPresentation, verifyPresentation, requestDemoCredential } = createIssuer(unlockedDid);

    const server = fastify({
        logger: true
    });

    server.register(require('fastify-cors'), {});
    server.register(require('fastify-swagger'), {
        routePrefix: '/docs',
        mode: 'static',
        specification: {
            path: __dirname + '/vc-http-api-0.0.0.yaml'
        },
        exposeRoute: true
    });
    server.register(fastifySensible);
    server.register(fastifyRawBody, {
        global: false, // don't add the rawBody to every request.
        runFirst: true // get the body before any preParsing hook change/uncompress it.
    });

    server.setErrorHandler(function (error, request, reply) {
        //request.log.error(error);
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
        '/issue/credentials',
        {
            config: {
                rawBody: true,
            },
            preValidation: [
                verifyRequestDigest,
                verifyRequestSignature
            ]
        },
        async (request, reply) => {
            const req: any = request.body;
            const credential = req.credential;
            const options = req.options;

            const result = await sign(credential, options);
            reply
                .code(201)
                .header('Content-Type', 'application/json; charset=utf-8')
                .send(result);
        }
    )

    server.post(
        '/prove/presentations', async (request, reply) => {
            const req: any = request.body;
            const credential = req.presentation;
            const options = req.options;

            const result = await signPresentation(credential, options);
            reply
                .code(201)
                .header('Content-Type', 'application/json; charset=utf-8')
                .send(result);
        }
    )

    server.post(
        '/verify/credentials', async (request, reply) => {
            const req: any = request.body;
            const verifiableCredential = req.verifiableCredential;
            const options = req.options;

            const result = await verify(verifiableCredential, options);
            reply
                .code(200)
                .header('Content-Type', 'application/json; charset=utf-8')
                .send(result);
        }
    )

    server.post(
        '/request/democredential/nodidproof', async (request, reply) => {
            const requestInfo = request.body;

            const result = await requestDemoCredential(requestInfo, true);
            reply
                .code(201)
                .header('Content-Type', 'application/json; charset=utf-8')
                .send(result);
        }
    )

    server.post(
        '/request/democredential', async (request, reply) => {
            const requestInfo = request.body;

            const result = await requestDemoCredential(requestInfo);
            reply
                .code(201)
                .header('Content-Type', 'application/json; charset=utf-8')
                .send(result);
        }
    )

    server.post(
        '/verify/presentations', async (request, reply) => {
            const requestInfo: any = request.body;
            const verifiablePresentation = requestInfo.verifiablePresentation;
            const options = requestInfo.options;

            const verificationResult = await verifyPresentation(verifiablePresentation, options);
            if (verificationResult.verified) {
                reply
                    .code(200)
                    .header('Content-Type', 'application/json; charset=utf-8')
                    .send({
                        // note: holder is not part of the vc-http-api standard
                        holder: verifiablePresentation.holder
                    });
            } else {
                reply
                    .code(500)
                    .send({ message: 'Could not validate DID', error: verificationResult });
            }
        }
    )


    server.post(
        '/generate/controlproof', async (request, reply) => {
            const req: any = request.body;
            const { presentationId, holder, ...options } = req;

            const result = await createAndSignPresentation(null, presentationId, holder, options);

            reply
                .code(201)
                .header('Content-Type', 'application/json; charset=utf-8')
                .send(result);
        }
    )

    server.post('/validation/cred-check', async (request, reply) => {
        const error: {code: string; description: string} = {
            code: 'customCode',
            description: 'subject error'
        };
        const timeOfWaiting = (): number => {
            return Math.floor(Math.random() * (4000 - 2000)) + 2000;
        };
        setTimeout(() => {
            reply
                .code(200)
                .header('Content-Type', 'application/json; charset=utf-8')
                .send([
                    {key: 'subject', error},
                    {key: 'issuer', error: null},
                    {key: 'issuanceDate', error: null},
                ]);
        }, timeOfWaiting())
    });

    server.post('/validation/proof', async (request, reply) => {
        const error: {code: string; description: string} = {
            code: 'customCode',
            description: 'metadata error'
        };
        const timeOfWaiting = (): number => {
            return Math.floor(Math.random() * (4000 - 2000)) + 2000;
        };
        setTimeout(() => {
            reply
                .code(200)
                .header('Content-Type', 'application/json; charset=utf-8')
                .send([
                    {key: 'metadata', error},
                    {key: 'isCorrectKey', error: null},
                    {key: 'isCorrectSignature', error: null},
                    {key: 'proofPurpose', error: null},
                ]);
        }, timeOfWaiting())
    });

    server.post('/validation/final-check', async (request, reply) => {
        const error: {code: string; description: string} = {
            code: 'customCode',
            description: 'expiration error'
        };
        const timeOfWaiting = (): number => {
            return Math.floor(Math.random() * (4000 - 2000)) + 2000;
        };
        setTimeout(() => {
            reply
                .code(200)
                .header('Content-Type', 'application/json; charset=utf-8')
                .send([
                    {key: 'expiration', error},
                    {key: 'status', error: null},
                    {key: 'fitnessForPurpose', error: null}
                ]);
        }, timeOfWaiting())
    });

    return server
}