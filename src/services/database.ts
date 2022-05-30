import {Email, User, UserBody, UserId} from "@/utils/types";
import {FastifyInstance} from "fastify/types/instance";
import {QueryResult} from "pg";

export class Database {
    constructor(private readonly fastify: FastifyInstance) {
    }

    getUser(id: UserId): Promise<User | undefined> {
        return this.selectOne('SELECT id, email, username, name, avatar, bio, company, location, website, github, twitter FROM profiles WHERE id=$1', [id])
    }

    getUserByEmail(email: Email): Promise<User | undefined> {
        return this.selectOne('SELECT id, email, username, name, avatar, bio, company, location, website, github, twitter FROM profiles WHERE email=$1', [email])
    }

    insertUser(user: User): Promise<void> {
        return this.insertOne(
            'INSERT INTO profiles (id, email, username, name, avatar, bio, company, location, website, github, twitter) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
            [user.id, user.email, user.username, user.name, user.avatar, user.bio, user.company, user.location, user.website, user.github, user.twitter]
        )
    }

    updateUser(id: UserId, user: UserBody): Promise<void> {
        return this.updateOne(
            'UPDATE profiles SET username=$1, name=$2, avatar=$3, bio=$4, company=$5, location=$6, website=$7, github=$8, twitter=$9, updated_at=$10 WHERE id=$11',
            [user.username, user.name, user.avatar, user.bio, user.company, user.location, user.website, user.github, user.twitter, new Date().toISOString(), id]
        )
    }

    private selectOne<T>(sql: string, values: any[]): Promise<T | undefined> {
        return this.query<T>(sql, values).then(result => result.rows[0])
    }

    private insertOne(sql: string, values: any[]): Promise<void> {
        return this.query(sql, values).then(_ => undefined)
    }

    private updateOne(sql: string, values: any[]): Promise<void> {
        return this.query(sql, values).then(_ => undefined)
    }

    private query<T>(sql: string, values: any[]): Promise<QueryResult<T>> {
        return new Promise((resolve, reject) => {
            this.fastify.pg.query(sql, values, (err, result) => err ? reject(err) : resolve(result))
        })
    }
}
