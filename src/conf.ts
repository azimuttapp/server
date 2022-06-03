import envSchema from "env-schema";
import {FastifyLoggerOptions} from "fastify/types/logger";
import fs from "fs";

export type Env = 'dev' | 'staging' | 'prod'
export type Mode = 'development' | 'production'

export class Conf {
    // this may throw!
    static load(): Conf {
        const env = envSchema({
            dotenv: true,
            schema: {
                type: 'object',
                required: ['PORT', 'ENV', 'POSTGRES_URL', 'JWT_SECRET'],
                properties: {
                    PORT: {type: 'integer', default: 3000},
                    ENV: {type: 'string', enum: ['dev', 'staging', 'prod']},
                    POSTGRES_URL: {type: 'string'},
                    JWT_SECRET: {type: 'string'},
                    CORS_ALLOW_ORIGIN: {type: 'string'},
                }
            }
        })
        const logDir = './logs'
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, {recursive: true})
        const logger: FastifyLoggerOptions = import.meta.env.DEV
            ? {prettyPrint: {translateTime: 'HH:MM:ss.l', ignore: 'pid,hostname'}}
            : {level: 'warn', file: logDir + '/warn-logs.log'}

        const conf = new Conf(
            env.PORT as number,
            env.ENV as Env,
            import.meta.env.MODE as Mode,
            env.POSTGRES_URL as string,
            env.JWT_SECRET as string,
            ((env.CORS_ALLOW_ORIGIN as string) || '').split(',').map(o => o.trim()).filter(o => !!o),
            logger,
        )
        if (conf.env === 'prod' && conf.mode !== 'production') throw `prod env is not in production mode!`
        if (conf.env === 'staging' && conf.mode !== 'production') throw `staging env is not in production mode!`
        return conf
    }

    static test(): Conf {
        return new Conf(3000, 'dev', 'development', 'db', 'jwt', [], {})
    }

    constructor(public readonly port: number,
                public readonly env: Env,
                public readonly mode: Mode,
                public readonly databaseUrl: string,
                public readonly jwtSecret: string,
                public readonly corsAllowOrigin: string[],
                public readonly logger: FastifyLoggerOptions) {
    }
}
