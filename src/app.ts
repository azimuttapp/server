import {FastifyInstance} from "fastify/types/instance";
import {Conf} from "@/conf";

export const buildApp = (fastify: FastifyInstance, conf: Conf): FastifyInstance => {
    fastify.get('/', async (request, reply) => {
        return {hello: 'world'}
    })
    fastify.get('/users', async (request, reply) => {
        fastify.pg.query('SELECT id, username, email, name, avatar, * FROM profiles', [], (err, result) => {
            reply.send(err || result.rows)
        })
    })
    fastify.get('/ping', async (request, reply) => {
        return {status: 200}
    })
    fastify.get('/health', async (request, reply) => {
        return {env: conf.env, webserver: 'ok'}
    })
    return fastify
}
