import {buildApp} from './app'
import {fastify as Fastify} from 'fastify'
import {Conf} from "@/conf";
import {FastifyInstance} from "fastify/types/instance";
import {Server} from "@/server";

let app: FastifyInstance

try {
    const conf = Conf.load()
    app = buildApp(Server.create(conf), conf)
    if (conf.mode === 'production') {
        app.listen(conf.port, '0.0.0.0')
        console.log(`Server started on 0.0.0.0:${conf.port}`)
    }
} catch (err) {
    Fastify({logger: true}).log.error(err)
    process.exit(1)
}

export const viteNodeApp = app
