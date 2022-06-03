import {describe, expect, it} from 'vitest'
import {extend, ObjectSchema, omit} from "@/utils/schemas";

describe('test schemas', () => {
    it('omit works well', () => {
        const objectSchema: ObjectSchema = {
            type: 'object',
            properties: {
                id: {type: 'string'},
                name: {type: 'string'}
            },
            required: ['id', 'name']
        }
        const nameOnly = omit(objectSchema, ['id'])
        expect(nameOnly).toEqual({
            type: 'object',
            properties: {
                name: {type: 'string'}
            },
            required: ['name']
        })
    })
    it('extend works well', () => {
        const objectSchema: ObjectSchema = {
            type: 'object',
            properties: {
                id: {type: 'string'},
                name: {type: 'string'}
            },
            required: ['id', 'name']
        }
        const extended = extend(objectSchema, {
            email: {type: 'string'}
        }, ['email'])
        expect(extended).toEqual({
            type: 'object',
            properties: {
                id: {type: 'string'},
                name: {type: 'string'},
                email: {type: 'string'}
            },
            required: ['id', 'name', 'email']
        })
    })
})
