import {FastifyInstance} from "fastify/types/instance";
import {fastify as Fastify, FastifyReply, FastifyRequest} from "fastify";
import postgres from "@fastify/postgres";
import jwt from "@fastify/jwt";
import {Conf} from "@/conf";
import {RouteGenericInterface, RouteShorthandOptions} from "fastify/types/route";
import {
    HTTPMethods,
    RawReplyDefaultExpression,
    RawRequestDefaultExpression,
    RawServerDefault
} from "fastify/types/utils";

export class Server {
    static create(conf: Conf): Server {
        const fastify = Fastify({
            logger: conf.logger,
            pluginTimeout: 50000,
            bodyLimit: 15485760,
        })
        fastify.register(postgres, {connectionString: conf.databaseUrl})
        fastify.register(jwt, {secret: conf.jwtSecret})
        return new Server(fastify)
    }

    constructor(public readonly fastify: FastifyInstance) {
    }

    get<Route extends RouteGenericInterface>(
        path: string,
        opts: RouteShorthandOptions<RawServerDefault, RawRequestDefaultExpression, RawReplyDefaultExpression, Route>,
        handler: (req: FastifyRequest<Route>, res: Response<Route['Reply']>) => void | Promise<void>
    ): Server {
        return this.route('GET', path, opts, handler)
    }

    authedGet<Route extends RouteGenericInterface>(
        path: string,
        opts: RouteShorthandOptions<RawServerDefault, RawRequestDefaultExpression, RawReplyDefaultExpression, Route>,
        handler: (req: AuthedRequest<Route>, res: Response<Route['Reply']>) => void | Promise<void>
    ): Server {
        return this.authed('GET', path, opts, handler)
    }

    authedPost<Route extends RouteGenericInterface>(
        path: string,
        opts: RouteShorthandOptions<RawServerDefault, RawRequestDefaultExpression, RawReplyDefaultExpression, Route>,
        handler: (req: AuthedRequest<Route>, res: Response<Route['Reply']>) => void | Promise<void>
    ): Server {
        return this.authed('POST', path, opts, handler)
    }

    authedPut<Route extends RouteGenericInterface>(
        path: string,
        opts: RouteShorthandOptions<RawServerDefault, RawRequestDefaultExpression, RawReplyDefaultExpression, Route>,
        handler: (req: AuthedRequest<Route>, res: Response<Route['Reply']>) => void | Promise<void>
    ): Server {
        return this.authed('PUT', path, opts, handler)
    }

    private route<Route extends RouteGenericInterface>(
        method: HTTPMethods,
        path: string,
        opts: RouteShorthandOptions<RawServerDefault, RawRequestDefaultExpression, RawReplyDefaultExpression, Route>,
        handler: (req: FastifyRequest<Route>, res: Response<Route['Reply']>) => void | Promise<void>
    ): Server {
        this.fastify.route<Route>({
            ...opts,
            method,
            url: path,
            handler: (req: FastifyRequest<Route>, reply: FastifyReply) => handler(req, new Response<Route['Reply']>(reply))
        })
        return this
    }

    private authed<Route extends RouteGenericInterface>(
        method: HTTPMethods,
        path: string,
        opts: RouteShorthandOptions<RawServerDefault, RawRequestDefaultExpression, RawReplyDefaultExpression, Route>,
        handler: (req: AuthedRequest<Route>, res: Response<Route['Reply']>) => void | Promise<void>
    ): Server {
        const onRequest = Array.isArray(opts.onRequest) ? opts.onRequest : typeof opts.onRequest === 'function' ? [opts.onRequest] : []
        const authedOpts = {...opts, onRequest: onRequest.concat([authed])}
        return this.route(method, path, authedOpts, (req, res) => handler(req as AuthedRequest<Route>, res))
    }
}

class Response<Payload> {
    constructor(private readonly reply: FastifyReply) {
    }

    ok(payload: Payload): void {
        this.reply.send(payload)
    }

    noContent(): void {
        this.reply.code(204).send()
    }

    badRequest(message: string): void {
        this.reply.code(400).send({statusCode: 400, error: 'Bad Request', message})
    }

    notFound(message: string): void {
        this.reply.code(404).send({statusCode: 404, error: 'Not Found', message})
    }
}

// AUTH

export interface LoggedUser {
    id: string
    email: string
}

type AuthedRequest<Route extends RouteGenericInterface> = FastifyRequest<Route> & { user: LoggedUser }

const authed = async <Route extends RouteGenericInterface>(request: FastifyRequest<Route>, reply: FastifyReply) => {
    try {
        const user = await request.jwtVerify() as any
        if (user.aud === 'authenticated') {
            (request as AuthedRequest<Route>).user = {id: user.sub, email: user.email}
        } else {
            reply.send({statusCode: 403, error: 'Forbidden', message: 'No correct rights'})
        }
    } catch (err) {
        reply.send(err)
    }
}
