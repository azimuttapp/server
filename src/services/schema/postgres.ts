import {DatabaseSchema, SchemaExtractor} from "@/services/schema/extractor";
import {DatabaseUrl} from "@/types/basics";
import {Client, ClientConfig} from "pg";
import {groupBy} from "@/utils/array";

export class PostgresSchemaExtractor implements SchemaExtractor {
    static fromUrl(url: DatabaseUrl): Promise<PostgresSchemaExtractor> {
        return parseUrl(url).then(c => new PostgresSchemaExtractor(new Client(c)))
    }

    constructor(private readonly client: Client) {
    }

    getSchema(): Promise<DatabaseSchema> {
        return this.connect(async client => {
            const tables = await getTables(client)
            return {
                tables: tables.map(t => ({
                    schema: t.schema,
                    table: t.table,
                    view: t.isView,
                    columns: t.columns.map(c => ({
                        name: c.name,
                        type: c.kind,
                        nullable: c.nullable,
                        default: c.defaultValue
                    })),
                    primaryKey: null,
                    uniques: [],
                    indexes: [],
                    checks: [],
                })),
                relations: []
            }
        })
    }

    private connect<T>(exec: (c: Client) => Promise<T>): Promise<T> {
        return this.client.connect().then(_ => {
            return exec(this.client)
                .then(res => this.client.end().then(_ => res))
                .catch(err => this.client.end().then(_ => Promise.reject(err)))
        })
    }
}


export function parseUrl(url: DatabaseUrl): Promise<ClientConfig> {
    const regex = new RegExp('postgres:\/\/([^:]+):(.+)@([^:]+)(?::(\\d+))?\/([^/]+)')
    const found = url.match(regex) || []
    return Promise.resolve({
        host: found[3],
        port: found[4] ? parseInt(found[4], 10) : undefined,
        database: found[5] || undefined,
        user: found[1] || undefined,
        password: found[2] || undefined,
    })
}

interface RawColumn {
    table_schema: string
    table_name: string
    table_type: 'BASE TABLE' | 'VIEW' | 'FOREIGN' | 'LOCAL TEMPORARY'
    column_name: string
    ordinal_position: number
    column_default: string | null
    is_nullable: 'YES' | 'NO'
    data_type: string
    character_maximum_length: number | null
}

interface TableStruct {
    schema: string
    table: string
    isView: boolean
    columns: {
        name: string,
        kind: string,
        nullable: boolean
        defaultValue: string | null,
    }[]
}

async function getTables(client: Client): Promise<TableStruct[]> {
    const res = await client.query<RawColumn>(`SELECT t.table_schema,
                                                      t.table_name,
                                                      t.table_type,
                                                      c.column_name,
                                                      c.ordinal_position,
                                                      c.column_default,
                                                      c.is_nullable,
                                                      c.data_type,
                                                      c.character_maximum_length
                                               FROM information_schema.tables t
                                                        LEFT JOIN information_schema.columns c
                                                                  ON t.table_catalog =
                                                                     c.table_catalog AND
                                                                     t.table_schema =
                                                                     c.table_schema AND
                                                                     t.table_name =
                                                                     c.table_name
                                               WHERE t.TABLE_TYPE IN ('BASE TABLE', 'VIEW')
                                                 AND t.table_schema NOT IN ('information_schema', 'pg_catalog')`)
    return Object.values(groupBy(res.rows, c => `${c.table_schema}.${c.table_name}`)).map((columns: RawColumn[]) => {
        return {
            schema: columns[0].table_schema,
            table: columns[0].table_name,
            isView: columns[0].table_type === 'VIEW',
            columns: columns
                .sort((a, b) => a.ordinal_position - b.ordinal_position)
                .map(c => ({
                    name: c.column_name,
                    kind: c.data_type + (c.character_maximum_length ? `(${c.character_maximum_length})` : ''),
                    nullable: c.is_nullable === 'YES',
                    defaultValue: c.column_default
                }))
        }
    })
}
