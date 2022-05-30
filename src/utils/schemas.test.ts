import {describe, expect, it} from 'vitest'
import {ObjectSchema, omit} from "@/utils/schemas";

describe('test schemas', () => {
    it('omit works well', async () => {
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
})
