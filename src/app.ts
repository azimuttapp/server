import { fastify as Fastify, FastifyServerOptions } from 'fastify'

export default (opts?: FastifyServerOptions) => {
    const fastify = Fastify(opts)

    fastify.get('/', async (request, reply) => {
        return { hello: 'world' }
    })
    fastify.get('/ping', async (request, reply) => {
        return { status: 200 }
    })
    fastify.get('/health', async (request, reply) => {
        return { webserver: 'ok' }
    })

    return fastify
}
