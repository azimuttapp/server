import {FastifyInstance} from "fastify/types/instance";
import {QueryResult} from "pg";
import {LoggedUser} from "@/services/server";
import {User, UserBody, UserId} from "@/types/user";
import {Email} from "@/types/basics";
import {Project, ProjectId, ProjectInfo, ProjectWithInfoPost} from "@/types/project";

export class Database {
    constructor(private readonly fastify: FastifyInstance) {
    }

    getUser(id: UserId): Promise<User | undefined> {
        return this.selectOne('SELECT id, email, username, name, avatar, bio, company, location, website, github, twitter FROM profiles WHERE id=$1', [id])
    }

    getUserByEmail(email: Email): Promise<User | undefined> {
        return this.selectOne('SELECT id, email, username, name, avatar, bio, company, location, website, github, twitter FROM profiles WHERE email=$1', [email])
    }

    insertUser(user: User, auth: LoggedUser): Promise<void> {
        if (user.id !== auth.id) return Promise.reject(`You can only create your own profile`)
        return this.insertOne(
            'INSERT INTO profiles (id, email, username, name, avatar, bio, company, location, website, github, twitter) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
            [user.id, user.email, user.username, user.name, user.avatar, user.bio, user.company, user.location, user.website, user.github, user.twitter]
        )
    }

    updateUser(id: UserId, user: UserBody, auth: LoggedUser): Promise<void> {
        if (id !== auth.id) return Promise.reject(`You can only update your profile`)
        return this.updateOne(
            'UPDATE profiles SET username=$1, name=$2, avatar=$3, bio=$4, company=$5, location=$6, website=$7, github=$8, twitter=$9, updated_at=$10 WHERE id=$11',
            [user.username, user.name, user.avatar, user.bio, user.company, user.location, user.website, user.github, user.twitter, new Date().toISOString(), id]
        )
    }

    getProjects(auth: LoggedUser): Promise<ProjectInfo[]> {
        return this.selectAll<any>(`SELECT id, name, tables, relations, layouts, created_at, updated_at FROM projects WHERE $1 = ANY (owners)`, [auth.id]).then(projects =>
            projects.map(({created_at, updated_at, ...project}) => ({
                ...project,
                createdAt: created_at,
                updatedAt: updated_at
            }))
        )
    }

    getProject(id: ProjectId, auth: LoggedUser): Promise<Project | undefined> {
        return this.selectOne<{ project: Project }>('SELECT project FROM projects WHERE id=$1 AND $2 = ANY (owners)', [id, auth.id]).then(res => res?.project)
    }

    insertProject(project: ProjectWithInfoPost, auth: LoggedUser): Promise<void> {
        if (isSample(project.id)) return Promise.reject("Samples can't be uploaded!")
        return this.insertOne(
            'INSERT INTO projects (id, name, tables, relations, layouts, owners, project, created_by, updated_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)',
            [project.id, project.name, project.tables, project.relations, project.layouts, [auth.id], project.project, auth.id])
    }

    updateProject(id: ProjectId, project: ProjectWithInfoPost, auth: LoggedUser): Promise<void> {
        if (id !== project.id || id !== project.project.id) return Promise.reject("Url and project id don't match!")
        return this.updateOne(
            `UPDATE projects SET name=$3, tables=$4, relations=$5, layouts=$6, project=$7, updated_at=$8, updated_by=$2 WHERE id = $1 AND $2 = ANY (owners)`,
            [id, auth.id, project.name, project.tables, project.relations, project.layouts, project.project, new Date().toISOString()])
    }

    deleteProject(id: ProjectId, auth: LoggedUser): Promise<void> {
        return this.deleteOne(`DELETE FROM projects WHERE id = $1 AND $2 = ANY (owners)`, [id, auth.id])
    }

    getProjectOwners(id: ProjectId, auth: LoggedUser): Promise<User[]> {
        const owners = `SELECT DISTINCT unnest(owners) FROM projects WHERE id=$1 AND $2 = ANY (owners)`
        return this.selectAll(`SELECT id, email, username, name, avatar, bio, company, location, website, github, twitter FROM profiles WHERE id IN (${owners})`, [id, auth.id])
    }

    updateProjectOwners(id: ProjectId, owners: UserId[], auth: LoggedUser): Promise<void> {
        return this.updateOne('UPDATE projects SET owners=$3 WHERE id=$1 AND $2 = ANY (owners)', [id, auth.id, owners])
    }

    private selectOne<T>(sql: string, values: any[]): Promise<T | undefined> {
        return this.query<T>(sql, values).then(result => result.rows[0])
    }

    private selectAll<T>(sql: string, values: any[]): Promise<T[]> {
        return this.query<T>(sql, values).then(result => result.rows)
    }

    private insertOne(sql: string, values: any[]): Promise<void> {
        return this.query(sql, values)
            .then(res => res.rowCount === 1 ? Promise.resolve() : Promise.reject(`Inserted ${res.rowCount} rows instead of 1!`))
    }

    private updateOne(sql: string, values: any[]): Promise<void> {
        return this.query(sql, values)
            .then(res => res.rowCount === 1 ? Promise.resolve() : Promise.reject(`Updated ${res.rowCount} rows instead of 1!`))
    }

    private deleteOne(sql: string, values: any[]): Promise<void> {
        return this.query(sql, values)
            .then(res => res.rowCount === 1 ? Promise.resolve() : Promise.reject(`Deleted ${res.rowCount} rows instead of 1!`))
    }

    private query<T>(sql: string, values: any[]): Promise<QueryResult<T>> {
        return new Promise((resolve, reject) => {
            this.fastify.pg.query(sql, values, (err, result) => err ? reject(err) : resolve(result))
        })
    }
}

function isSample(id: ProjectId): boolean {
    return id.startsWith('0000')
}
