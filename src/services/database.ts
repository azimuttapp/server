import {Email, User, UserId} from "@/utils/types";
import {FastifyInstance} from "fastify/types/instance";

export class Database {
    constructor(private readonly fastify: FastifyInstance) {
    }

    getUser(id: UserId): Promise<User | undefined> {
        return new Promise((resolve, reject) => {
            this.fastify.pg.query('SELECT id, username, email, name, avatar, bio, company, location, website, github, twitter FROM profiles WHERE id=$1', [id],
                (err, result) => err ? reject(err) : resolve(result.rows[0]))
        })
    }

    getUserByEmail(email: Email): Promise<User | undefined> {
        return new Promise((resolve, reject) => {
            this.fastify.pg.query('SELECT id, username, email, name, avatar, bio, company, location, website, github, twitter FROM profiles WHERE email=$1', [email],
                (err, result) => err ? reject(err) : resolve(result.rows[0]))
        })
    }
}
