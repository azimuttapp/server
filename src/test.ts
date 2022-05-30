import {afterAll, beforeAll} from 'vitest'
import {buildApp} from './app'
import {Conf} from "@/conf";
import {Server} from "@/services/server";
import {Database} from "@/services/database";

const conf = Conf.test()
const server = Server.create(conf)
const db = new Database(server.fastify)
export const app = buildApp(server, db, conf)

beforeAll(async () => {
    await app.fastify.ready()
})
afterAll(async () => {
    await app.fastify.close()
})
