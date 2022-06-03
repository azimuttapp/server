import {Conf} from "@/conf";
import * as s from "@/utils/schemas";
import {Database} from "@/services/database";
import {Server} from "@/services/server";
import {User, UserBody, UserId} from "@/types/user";
import {Email} from "@/types/basics";
import {Project, ProjectId, ProjectInfo, ProjectWithInfoPost} from "@/types/project";

export const buildApp = (server: Server, db: Database, conf: Conf): Server => {
    server.fastify.get('/', async (req, reply) => {
        return {hello: 'world'}
    })

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

    server.fastify.get('/ping', async (req, reply) => {
        return {status: 200}
    })
    server.fastify.get('/health', async (req, reply) => {
        return {env: conf.env, webserver: 'ok'}
    })

    return server
}
