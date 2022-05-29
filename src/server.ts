import {buildApp} from './app'
import {fastify as Fastify} from 'fastify'
import {Conf} from "@/conf";
import {FastifyInstance} from "fastify/types/instance";
import postgres from "@fastify/postgres";

let app: FastifyInstance

try {
    const conf = Conf.load()
    const fastify = Fastify({
        logger: conf.logger,
        pluginTimeout: 50000,
        bodyLimit: 15485760
    })
    fastify.register(postgres, {connectionString: conf.databaseUrl})
    app = buildApp(fastify, conf)
    if (conf.mode === 'production') {
        await app.listen(conf.port, '0.0.0.0')
        console.log(`Server started on 0.0.0.0:${conf.port}`)
    }
} catch (err) {
    Fastify({
        logger: true,
        pluginTimeout: 50000,
        bodyLimit: 15485760
    }).log.error(err)
    process.exit(1)
}

export const viteNodeApp = app
