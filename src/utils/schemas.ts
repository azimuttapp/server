export const empty = {type: 'null'}
export const uuid = {type: 'string', format: 'uuid'}
export const email = {type: 'string', format: 'email'}
export const timestamp = {type: 'number'}
export const databaseUrl = {type: 'string'}

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

// database schema
export const schemaName = {type: 'string', pattern: '[^ ]+'}
export const tableName = {type: 'string'}
export const columnName = {type: 'string'}
export const columnType = {type: 'string'}
export const relationName = {type: 'string'}
export const comment = {type: 'string'}
export const tableRef: ObjectSchema = {
    type: 'object',
    properties: {
        schema: schemaName,
        table: tableName,
    },
    additionalProperties: false
}
export const columnLink: ObjectSchema = {
    type: 'object',
    properties: {
        src: columnName,
        ref: columnName,
    },
    additionalProperties: false
}
export const relation: ObjectSchema = {
    type: 'object',
    properties: {
        name: relationName,
        src: tableRef,
        ref: tableRef,
        columns: array(columnLink),
    },
    additionalProperties: false
}
export const column: ObjectSchema = {
    type: 'object',
    properties: {
        name: columnName,
        type: columnType,
        nullable: {type: 'boolean'},
        default: {type: ['string', 'null']},
        comment: nullable(comment),
    },
    additionalProperties: false
}
export const check: ObjectSchema = {
    type: 'object',
    properties: {
        name: {type: 'string'},
        columns: array(columnName),
        predicate: {type: ['string', 'null']},
    },
    additionalProperties: false
}
export const index: ObjectSchema = {
    type: 'object',
    properties: {
        name: {type: 'string'},
        columns: array(columnName),
        definition: {type: ['string', 'null']},
    },
    additionalProperties: false
}
export const unique: ObjectSchema = {
    type: 'object',
    properties: {
        name: {type: 'string'},
        columns: array(columnName),
        definition: {type: ['string', 'null']},
    },
    additionalProperties: false
}
export const primaryKey: ObjectSchema = {
    type: 'object',
    properties: {
        name: {type: ['string', 'null']},
        columns: array(columnName),
    },
    additionalProperties: false
}
export const table: ObjectSchema = {
    type: 'object',
    properties: {
        schema: schemaName,
        table: tableName,
        view: {type: 'boolean'},
        columns: array(column),
        primaryKey: {oneOf: [{type: 'null'}, primaryKey]},
        uniques: array(unique),
        indexes: array(index),
        checks: array(check),
        comment: nullable(comment),
    },
    additionalProperties: false
}
export const databaseSchema: ObjectSchema = {
    type: 'object',
    properties: {
        tables: array(table),
        relations: array(relation),
    },
    additionalProperties: false
}

// error
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

export function nullable<T extends { type: string }>(type: T) {
    return {...type, type: [type.type, 'null']}
}

export function optional<T extends { type: string }>(type: T) {
    return {...type, optional: true}
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
