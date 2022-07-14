import {Conf} from "@/conf";
import * as s from "@/utils/schemas";
import {Database} from "@/services/database";
import {Server} from "@/services/server";
import {User, UserBody, UserId} from "@/types/user";
import {DatabaseUrl, Email} from "@/types/basics";
import {Project, ProjectId, ProjectInfo, ProjectWithInfoPost, SchemaName} from "@/types/project";
import {getSchemaExtractor} from "@/services/schema/factory";
import {DatabaseSchema} from "@/services/schema/extractor";
import {object} from "@/utils/schemas";

export const buildApp = (server: Server, db: Database, conf: Conf): Server => {
    server.fastify.get('/', (req, reply) => Promise.resolve({hello: 'world'}))
    server.fastify.get('/ping', (req, reply) => Promise.resolve({status: 200}))
    server.fastify.get('/health', (req, reply) => Promise.resolve({env: conf.env, webserver: 'ok'}))

    // users
    server.authedGet<{ Params: { id: UserId }, Reply: User }>('/users/:id', {
        schema: {params: {id: s.userId}, response: {200: s.user, 404: s.error}}
    }, (req, res) => res.maybe(db.getUser(req.params.id), `User does not exist`))
    server.authedGet<{ Querystring: { email: Email }, Reply: User }>('/users/fetch', {
        schema: {querystring: {email: s.email}, response: {200: s.user, 404: s.error}}
    }, (req, res) => res.maybe(db.getUserByEmail(req.query.email), `No user with email ${req.query.email}`))
    server.authedPost<{ Body: User, Reply: void }>('/users', {
        schema: {body: s.user, response: {200: s.empty, 400: s.error}}
    }, (req, res) => res.empty(db.insertUser(req.body, req.user)))
    server.authedPut<{ Params: { id: UserId }, Body: UserBody, Reply: void }>('/users/:id', {
        schema: {params: {id: s.userId}, body: s.userBody, response: {200: s.empty, 400: s.error}}
    }, (req, res) => res.empty(db.updateUser(req.params.id, req.body, req.user)))

    // projects
    server.authedGet<{ Reply: ProjectInfo[] }>('/projects', {
        schema: {response: {200: {type: "array", items: s.projectInfo}}}
    }, (req, res) => res.some(db.getProjects(req.user)))
    server.authedGet<{ Params: { id: ProjectId }, Reply: Project }>('/projects/:id', {
        schema: {params: {id: s.projectId}, response: {200: s.project}}
    }, (req, res) => res.maybe(db.getProject(req.params.id, req.user), `No accessible project with id ${req.params.id}`))
    server.authedPost<{ Body: ProjectWithInfoPost, Reply: void }>('/projects', {
        schema: {body: s.projectWithInfoPost, response: {200: s.empty, 400: s.error}}
    }, (req, res) => res.empty(db.insertProject(req.body, req.user)))
    server.authedPut<{ Params: { id: ProjectId }, Body: ProjectWithInfoPost, Reply: void }>('/projects/:id', {
        schema: {params: {id: s.projectId}, body: s.projectWithInfoPost, response: {200: s.empty, 400: s.error}}
    }, (req, res) => res.empty(db.updateProject(req.params.id, req.body, req.user)))
    server.authedDelete<{ Params: { id: ProjectId }, Reply: void }>('/projects/:id', {
        schema: {params: {id: s.projectId}, response: {200: s.empty, 400: s.error}}
    }, (req, res) => res.empty(db.deleteProject(req.params.id, req.user)))
    server.authedGet<{ Params: { id: ProjectId }, Reply: User[] }>('/projects/:id/owners', {
        schema: {params: {id: s.projectId}, response: {200: s.array(s.user), 404: s.error}}
    }, (req, res) => res.maybe(db.getProjectOwners(req.params.id, req.user), `No accessible project with id ${req.params.id}`))
    server.authedPut<{ Params: { id: ProjectId }, Body: UserId[], Reply: void }>('/projects/:id/owners', {
        schema: {params: {id: s.projectId}, body: s.array(s.userId), response: {200: s.empty, 400: s.error}}
    }, (req, res) => res.empty(db.updateProjectOwners(req.params.id, req.body, req.user)))

    // database
    server.get<{ Querystring: { url: DatabaseUrl, schema: SchemaName | undefined }, Reply: DatabaseSchema }>('/database/schema', {
        schema: {
            querystring: object({url: s.databaseUrl, schema: s.schemaName}, ['url']),
            response: {200: s.databaseSchema, 404: s.error}
        }
    }, (req, res) => res.some(getSchemaExtractor(req.query.url).then(e => e.getSchema(req.query.schema))))

    return server
}
