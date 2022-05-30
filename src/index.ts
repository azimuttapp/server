import {buildApp} from './app'
import {fastify as Fastify} from 'fastify'
import {Conf} from "@/conf";
import {Server} from "@/services/server";
import {Database} from "@/services/database";

let app: Server

try {
    const conf = Conf.load()
    const server = Server.create(conf)
    const db = new Database(server.fastify)
    app = buildApp(server, db, conf)
    if (conf.mode === 'production') {
        app.fastify.listen(conf.port, '0.0.0.0')
        console.log(`Server started on 0.0.0.0:${conf.port}`)
    }
} catch (err) {
    Fastify({logger: true}).log.error(err)
    process.exit(1)
}

export const viteNodeApp = app.fastify
