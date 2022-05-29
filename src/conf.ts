import envSchema from "env-schema";
import {FastifyLoggerOptions} from "fastify/types/logger";
import fs from "fs";

export type Env = 'dev' | 'staging' | 'prod'
export type Mode = 'development' | 'production'

export class Conf {
    // this may throw!
    static load() {
        const env = envSchema({
            dotenv: true,
            schema: {
                type: 'object',
                required: ['PORT', 'ENV'],
                properties: {
                    PORT: {type: 'integer', default: 3000},
                    ENV: {type: 'string', enum: ['dev', 'staging', 'prod']}
                }
            }
        })
        const logDir = './logs'
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, {recursive: true})
        const logger: FastifyLoggerOptions = import.meta.env.DEV
            ? {prettyPrint: {translateTime: 'HH:MM:ss.l', ignore: 'pid,hostname'}}
            : {level: 'warn', file: logDir + '/warn-logs.log'}

        const conf = new Conf(env.PORT as number, env.ENV as Env, import.meta.env.MODE as Mode, logger)
        if (conf.env === 'prod' && conf.mode !== 'production') throw `prod env is not in production mode!`
        if (conf.env === 'staging' && conf.mode !== 'production') throw `staging env is not in production mode!`
        return conf
    }

    static test() {
        return new Conf(3000, 'dev', 'development', {})
    }

    constructor(public readonly port: number,
                public readonly env: Env,
                public readonly mode: Mode,
                public readonly logger: FastifyLoggerOptions) {
    }
}