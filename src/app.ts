import {FastifyInstance} from "fastify/types/instance";
import {Conf} from "@/conf";
import {Authenticated} from "@/server";


export const buildApp = (fastify: FastifyInstance, conf: Conf): FastifyInstance => {
    fastify.get('/', async (request, reply) => {
        return {hello: 'world'}
    })
    fastify.get('/users', async (request, reply) => {
        fastify.pg.query('SELECT id, username, email, name, avatar, * FROM profiles', [], (err, result) => {
            reply.send(err || result.rows)
        })
    })
    fastify.get('/profile', {onRequest: [fastify.authenticated]}, async (request, reply) => {
        return  request.user as Authenticated
    })
    fastify.get('/ping', async (request, reply) => {
        return {status: 200}
    })
    fastify.get('/health', async (request, reply) => {
        return {env: conf.env, webserver: 'ok'}
    })
    return fastify
}
