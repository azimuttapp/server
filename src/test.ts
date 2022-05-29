import { beforeAll, afterAll } from 'vitest'
import buildFastify from './app'

const fastify = buildFastify()

beforeAll(async () => {
    await fastify.ready()
})
afterAll(async () => {
    await fastify.close()
})

export default fastify
