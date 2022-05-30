export const uuid = {type: 'string', format: 'uuid'}
export const email = {type: 'string', format: 'email'}
export const userId = {type: 'string', format: 'uuid'}
export const user = {
    type: 'object',
    properties: {
        id: userId,
        username: {type: 'string'},
        email: email,
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
export const error = {
    type: 'object',
    properties: {
        statusCode: {type: 'number'},
        error: {type: 'string'},
        message: {type: 'string'}
    },
    required: ['statusCode', 'error', 'message'],
}
