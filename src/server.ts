import {buildApp} from './app'
import {fastify} from 'fastify'
import {Conf} from "@/conf";
import {FastifyInstance} from "fastify/types/instance";

let app: FastifyInstance

try {
    const conf = Conf.load()
    app = buildApp(fastify({
        logger: conf.logger,
        pluginTimeout: 50000,
        bodyLimit: 15485760
    }), conf)
    if (conf.mode === 'production') {
        app.listen(conf.port, '0.0.0.0')
        console.log(`Server started on 0.0.0.0:${conf.port}`)
    }
} catch (err) {
    fastify({
        logger: true,
        pluginTimeout: 50000,
        bodyLimit: 15485760
    }).log.error(err)
    process.exit(1)
}

export const viteNodeApp = app
