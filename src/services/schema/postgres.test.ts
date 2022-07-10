import {describe, expect, it} from 'vitest'
import {parseUrl} from "@/services/schema/postgres";

describe('postgres', () => {
    it('parseUrl', async () => {
        expect(await parseUrl('postgres://dbuser:dbpassword@database.server.com:5432/mydb')).toEqual({
            user: 'dbuser',
            password: 'dbpassword',
            host: 'database.server.com',
            port: 5432,
            database: 'mydb',
        })
        expect(await parseUrl('postgres://postgres:abc@def@db.toto.supabase.co/postgres')).toEqual({
            user: 'postgres',
            password: 'abc@def',
            host: 'db.toto.supabase.co',
            port: undefined,
            database: 'postgres'
        })
    })
})
