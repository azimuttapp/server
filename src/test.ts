import {afterAll, beforeAll} from 'vitest'
import {buildApp} from './app'
import {fastify} from 'fastify'
import {Conf} from "@/conf";

export const app = buildApp(fastify(), Conf.test())

beforeAll(async () => {
    await app.ready()
})
afterAll(async () => {
    await app.close()
})
