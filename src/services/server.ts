import {FastifyInstance} from "fastify/types/instance";
import {fastify as Fastify, FastifyReply, FastifyRequest} from "fastify";
import postgres from "@fastify/postgres";
import jwt from "@fastify/jwt";
import {Conf} from "@/conf";
import {onRequestHookHandler} from "fastify/types/hooks";
import {RouteGenericInterface, RouteShorthandOptions} from "fastify/types/route";
import {RawReplyDefaultExpression, RawRequestDefaultExpression, RawServerDefault} from "fastify/types/utils";

declare module 'fastify' {
    export interface FastifyInstance {
        auth: onRequestHookHandler;
        authenticated: onRequestHookHandler;
    }
}

export interface Authenticated {
    id: string
    email: string
}

export class Server {
    static create(conf: Conf): Server {
        const fastify = Fastify({
            logger: conf.logger,
            pluginTimeout: 50000,
            bodyLimit: 15485760,
        })
        fastify.register(postgres, {connectionString: conf.databaseUrl})
        fastify.register(jwt, {secret: conf.jwtSecret})
        fastify.decorate('auth', async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                await request.jwtVerify()
            } catch (err) {
                reply.send(err)
            }
        })
        // FIXME: avoid leak: https://www.fastify.io/docs/latest/Reference/Decorators
        fastify.decorate('authenticated', async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const user = await request.jwtVerify() as any
                if (user.aud === 'authenticated') {
                    request.user = {id: user.sub, email: user.email} as Authenticated
                } else {
                    reply.send({statusCode: 403, error: 'Forbidden', message: 'No correct rights'})
                }
            } catch (err) {
                reply.send(err)
            }
        })
        return new Server(fastify)
    }

    constructor(public readonly fastify: FastifyInstance) {
    }

    get<Route extends RouteGenericInterface>(
        path: string,
        opts: RouteShorthandOptions<RawServerDefault, RawRequestDefaultExpression, RawReplyDefaultExpression, Route>,
        handler: (req: FastifyRequest<Route>, res: Response<Route['Reply']>) => void | Promise<void>
    ): Server {
        this.fastify.get<Route>(path, opts, (req: FastifyRequest<Route>, reply: FastifyReply) => handler(req, new Response<Route['Reply']>(reply)))
        return this
    }
}

class Response<Payload> {
    constructor(private readonly reply: FastifyReply) {
    }

    ok(payload: Payload): void {
        this.reply.send(payload)
    }

    notFound(message: string): void {
        this.reply.code(404).send({statusCode: 404, error: 'Not Found', message})
    }
}
