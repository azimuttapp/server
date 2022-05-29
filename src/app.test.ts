import {describe, expect, it} from 'vitest'
import {app} from '@/test'

describe('Test server health', () => {
    it('serve GET /', async () => {
        const res = await app.inject('/')
        expect(res.json()).toEqual({hello: 'world'})
    })
    it('serve GET /ping', async () => {
        const res = await app.inject('/ping')
        expect(res.json()).toEqual({status: 200})
    })
})
