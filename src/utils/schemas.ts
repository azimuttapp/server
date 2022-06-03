export const empty = {type: 'null'}
export const uuid = {type: 'string', format: 'uuid'}
export const email = {type: 'string', format: 'email'}
export const timestamp = {type: 'number'}

export const userId = {type: 'string', format: 'uuid'}
export const user: ObjectSchema = {
    type: 'object',
    properties: {
        id: userId,
        email: email,
        username: {type: 'string'},
        name: {type: 'string'},
        avatar: {type: ['string', 'null']},
        bio: {type: ['string', 'null']},
        company: {type: ['string', 'null']},
        location: {type: ['string', 'null']},
        website: {type: ['string', 'null']},
        github: {type: ['string', 'null']},
        twitter: {type: ['string', 'null']},
    },
    required: ['id', 'username', 'email', 'name'],
    additionalProperties: false
}
export const userBody = omit(user, ['id', 'email'])

export const projectId = {type: 'string', format: 'uuid'}
export const projectName = {type: 'string'}
export const project = {
    type: 'object',
    additionalProperties: true
}
export const projectInfo: ObjectSchema = {
    type: 'object',
    properties: {
        id: projectId,
        name: projectName,
        tables: {type: 'number'},
        relations: {type: 'number'},
        layouts: {type: 'number'},
        createdAt: timestamp,
        updatedAt: timestamp,
    },
    required: ['id', 'name', 'tables', 'relations', 'layouts', 'createdAt', 'updatedAt'],
    additionalProperties: false
}
export const projectWithInfo: ObjectSchema = extend(projectInfo, {
    project: project
}, ['project'])
export const projectWithInfoPost = omit(projectWithInfo, ['createdAt', 'updatedAt'])

export const error = {
    type: 'object',
    properties: {
        statusCode: {type: 'number'},
        error: {type: 'string'},
        message: {type: 'string'}
    },
    required: ['statusCode', 'error', 'message'],
}

export function array(type: any) {
    return {type: 'array', items: type}
}

// HELPERS

export type ObjectSchema = {
    type: 'object'
    properties: { [key: string]: any }
    required?: string[]
    additionalProperties?: boolean
}

export function omit(objectSchema: ObjectSchema, keys: string[]): ObjectSchema {
    return {
        ...objectSchema,
        properties: Object.fromEntries(Object.entries(objectSchema.properties).filter(([key]) => !keys.includes(key))),
        required: (objectSchema.required || []).filter(k => !keys.includes(k))
    }
}

export function extend(objectSchema: ObjectSchema, properties: { [key: string]: any }, required?: string[]): ObjectSchema {
    return {
        ...objectSchema,
        properties: Object.assign({}, objectSchema.properties, properties),
        required: (objectSchema.required || []).concat(required || [])
    }
}
