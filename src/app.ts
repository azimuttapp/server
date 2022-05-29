import {FastifyInstance} from "fastify/types/instance";
import {Conf} from "@/conf";

export const buildApp = (server: FastifyInstance, conf: Conf): FastifyInstance => {
    server.get('/', async (request, reply) => {
        return {hello: 'world'}
    })
    server.get('/ping', async (request, reply) => {
        return {status: 200}
    })
    server.get('/health', async (request, reply) => {
        return {env: conf.env, webserver: 'ok'}
    })
    return server
}
