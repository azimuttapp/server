import {Conf} from "@/conf";
import {Email, User, UserId} from "@/utils/types";
import * as schemas from "@/utils/schemas";
import {Database} from "@/services/database";
import {Server} from "@/services/server";

export const buildApp = (server: Server, db: Database, conf: Conf): Server => {
    server.fastify.get('/', async (req, reply) => {
        return {hello: 'world'}
    })

    server.authedGet<{ Params: { id: UserId }, Reply: User }>('/users/:id', {
        schema: {params: {id: schemas.userId}, response: {200: schemas.user, 404: schemas.error}}
    }, async (req, res) => {
        const user = await db.getUser(req.params.id)
        user ? res.ok(user) : res.notFound(`User ${req.params.id} does not exist`)
    })
    server.authedGet<{ Querystring: { email: Email }, Reply: User }>('/users/fetch', {
        schema: {querystring: {email: schemas.email}, response: {200: schemas.user, 404: schemas.error}}
    }, async (req, res) => {
        const user = await db.getUserByEmail(req.query.email)
        user ? res.ok(user) : res.notFound(`No user with email ${req.query.email}`)
    })

    server.fastify.get('/users', async (req, reply) => {
        server.fastify.pg.query('SELECT id, username, email, name, avatar, * FROM profiles', [], (err, result) => {
            reply.send(err || result.rows)
        })
    })
    server.fastify.get('/ping', async (req, reply) => {
        return {status: 200}
    })
    server.fastify.get('/health', async (req, reply) => {
        return {env: conf.env, webserver: 'ok'}
    })

    return server
}
