import { fastify as Fastify, FastifyServerOptions } from 'fastify'

export default (opts?: FastifyServerOptions) => {
    const fastify = Fastify(opts)

    fastify.get('/', async (request, reply) => {
        return { hello: 'world' }
    })

    return fastify
}
