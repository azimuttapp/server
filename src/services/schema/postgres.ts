import {DatabaseSchema, SchemaExtractor} from "@/services/schema/extractor";
import {DatabaseUrl} from "@/types/basics";
import {Client, ClientConfig} from "pg";
import {groupBy} from "@/utils/array";
import {SchemaName, TableId} from "@/types/project";

export class PostgresSchemaExtractor implements SchemaExtractor {
    static fromUrl(url: DatabaseUrl): Promise<PostgresSchemaExtractor> {
        return parseUrl(url).then(c => new PostgresSchemaExtractor(new Client(c)))
    }

    constructor(private readonly client: Client) {
    }

    getSchema(schema: SchemaName | undefined): Promise<DatabaseSchema> {
        return this.connect(async client => {
            const columns = await getColumns(client, schema).then(cols => groupBy(cols, toTableId))
            const columnsByIndex: { [tableId: string]: { [columnIndex: number]: RawColumn } } = Object.keys(columns).reduce((acc, tableId) => ({
                ...acc,
                [tableId]: columns[tableId].reduce((acc, c) => ({...acc, [c.column_index]: c}), {})
            }), {})
            const getColumnName = (tableId: string) => (columnIndex: number): string => columnsByIndex[tableId]?.[columnIndex]?.column_name || 'unknown'
            const constraints = await getConstraints(client, schema).then(cols => groupBy(cols, toTableId))
            const indexes = await getIndexes(client, schema).then(cols => groupBy(cols, toTableId))
            const comments = await getComments(client, schema).then(cols => groupBy(cols, toTableId))
            const relations = await getRelations(client, schema)
            return {
                tables: Object.entries(columns).map(([tableId, columns]) => {
                    const tableConstraints = constraints[tableId] || []
                    const tableIndexes = indexes[tableId] || []
                    const tableComments = comments[tableId] || []
                    return {
                        schema: columns[0].table_schema,
                        table: columns[0].table_name,
                        view: columns[0].table_kind !== 'r',
                        columns: columns
                            .sort((a, b) => a.column_index - b.column_index)
                            .map(col => ({
                                name: col.column_name,
                                type: col.column_type,
                                nullable: col.column_nullable,
                                default: col.column_default,
                                comment: tableComments.find(c => c.column_name === col.column_name)?.description || null
                            })),
                        primaryKey: tableConstraints.filter(c => c.constraint_type === 'p').map(c => ({
                            name: c.constraint_name,
                            columns: c.columns.map(getColumnName(tableId))
                        }))[0] || null,
                        uniques: tableIndexes.filter(i => i.is_unique).map(i => ({
                            name: i.index_name,
                            columns: i.columns.map(getColumnName(tableId)),
                            definition: i.definition
                        })),
                        indexes: tableIndexes.filter(i => !i.is_unique).map(i => ({
                            name: i.index_name,
                            columns: i.columns.map(getColumnName(tableId)),
                            definition: i.definition
                        })),
                        checks: tableConstraints.filter(c => c.constraint_type === 'c').map(c => ({
                            name: c.constraint_name,
                            columns: c.columns.map(getColumnName(tableId)),
                            predicate: c.definition
                        })),
                        comment: tableComments.find(c => c.column_name === null)?.description || null
                    }
                }),
                relations: relations.map(r => ({
                    name: r.constraint_name,
                    src: {
                        schema: r.table_schema,
                        table: r.table_name,
                        columns: r.columns.map(getColumnName(toTableId(r)))
                    },
                    ref: {
                        schema: r.target_schema,
                        table: r.target_table,
                        columns: r.target_columns.map(getColumnName(toTableId({
                            table_schema: r.target_schema,
                            table_name: r.target_table
                        })))
                    },
                }))
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

function toTableId<T extends { table_schema: string, table_name: string }>(value: T): TableId {
    return `${value.table_schema}.${value.table_name}`
}

interface RawColumn {
    table_schema: string
    table_name: string
    table_kind: 'r' | 'v' | 'm' // r: table, v: view, m: materialized view
    column_name: string
    column_type: string
    column_index: number
    column_default: string | null
    column_nullable: boolean
}

async function getColumns(client: Client, schema: SchemaName | undefined): Promise<RawColumn[]> {
    // https://www.postgresql.org/docs/current/catalog-pg-attribute.html: stores information about table columns. There will be exactly one row for every column in every table in the database.
    // https://www.postgresql.org/docs/current/catalog-pg-class.html: catalogs tables and most everything else that has columns or is otherwise similar to a table. This includes indexes (but see also pg_index), sequences (but see also pg_sequence), views, materialized views, composite types, and TOAST tables; see relkind.
    // https://www.postgresql.org/docs/current/catalog-pg-namespace.html: stores namespaces. A namespace is the structure underlying SQL schemas: each namespace can have a separate collection of relations, types, etc. without name conflicts.
    // https://www.postgresql.org/docs/current/catalog-pg-attrdef.html: stores column default values.
    return await client.query<RawColumn>(
        `SELECT n.nspname                            as table_schema,
                c.relname                            as table_name,
                c.relkind                            as table_kind,
                a.attname                            as column_name,
                format_type(a.atttypid, a.atttypmod) as column_type,
                a.attnum                             as column_index,
                pg_get_expr(d.adbin, d.adrelid)      as column_default,
                NOT a.attnotnull                     as column_nullable
         FROM pg_attribute a
                  JOIN pg_class c on c.oid = a.attrelid
                  JOIN pg_namespace n ON n.oid = c.relnamespace
                  LEFT OUTER JOIN pg_attrdef d on d.adrelid = c.oid AND d.adnum = a.attnum
         WHERE c.relkind IN ('r', 'v', 'm')
           AND a.attnum > 0
           AND ${filterSchema('n.nspname', schema)}`
    ).then(res => res.rows)
}

interface RawConstraint {
    constraint_type: 'p' | 'c' // p: primary key, c: check
    constraint_name: string
    table_schema: string
    table_name: string
    columns: number[]
    definition: string
}

async function getConstraints(client: Client, schema: SchemaName | undefined): Promise<RawConstraint[]> {
    // https://www.postgresql.org/docs/current/catalog-pg-constraint.html: stores check, primary key, unique, foreign key, and exclusion constraints on tables. Not-null constraints are represented in the pg_attribute catalog, not here.
    // https://www.postgresql.org/docs/current/catalog-pg-class.html: catalogs tables and most everything else that has columns or is otherwise similar to a table. This includes indexes (but see also pg_index), sequences (but see also pg_sequence), views, materialized views, composite types, and TOAST tables; see relkind.
    // https://www.postgresql.org/docs/current/catalog-pg-namespace.html: stores namespaces. A namespace is the structure underlying SQL schemas: each namespace can have a separate collection of relations, types, etc. without name conflicts.
    return await client.query<RawConstraint>(
        `SELECT cn.contype                         as constraint_type
              , cn.conname                         as constraint_name
              , n.nspname                          as table_schema
              , c.relname                          as table_name
              , cn.conkey                          as columns
              , pg_get_constraintdef(cn.oid, true) as definition
         FROM pg_constraint cn
                  JOIN pg_class c on c.oid = cn.conrelid
                  JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE cn.contype IN ('p', 'c')
           AND ${filterSchema('n.nspname', schema)};`
    ).then(res => res.rows)
}

interface RawIndex {
    index_name: string
    table_schema: string
    table_name: string
    columns: number[]
    definition: string
    is_unique: boolean
}

async function getIndexes(client: Client, schema: SchemaName | undefined): Promise<RawIndex[]> {
    // https://www.postgresql.org/docs/current/catalog-pg-index.html: contains part of the information about indexes. The rest is mostly in pg_class.
    // https://www.postgresql.org/docs/current/catalog-pg-class.html: catalogs tables and most everything else that has columns or is otherwise similar to a table. This includes indexes (but see also pg_index), sequences (but see also pg_sequence), views, materialized views, composite types, and TOAST tables; see relkind.
    // https://www.postgresql.org/docs/current/catalog-pg-namespace.html: stores namespaces. A namespace is the structure underlying SQL schemas: each namespace can have a separate collection of relations, types, etc. without name conflicts.
    return await client.query<RawIndex>(
        `SELECT ic.relname                             as index_name
              , tn.nspname                             as table_schema
              , tc.relname                             as table_name
              , i.indkey                               as columns
              , pg_get_indexdef(i.indexrelid, 0, true) as definition
              , i.indisunique                          as is_unique
         FROM pg_index i
                  JOIN pg_class ic on ic.oid = i.indexrelid
                  JOIN pg_class tc on tc.oid = i.indrelid
                  JOIN pg_namespace tn ON tn.oid = tc.relnamespace
         WHERE indisprimary = false
           AND ${filterSchema('tn.nspname', schema)};`
    ).then(res => res.rows.map(r => ({
        ...r,
        columns: (r.columns as any as string).split(' ').map(c => parseInt(c, 10)).filter(i => i !== 0),
        definition: r.definition.indexOf('USING') > 0 ? r.definition.split('USING')[1].trim() : r.definition
    })))
}

interface RawComment {
    table_schema: string
    table_name: string
    column_name: string | null
    description: string
}

async function getComments(client: Client, schema: SchemaName | undefined): Promise<RawComment[]> {
    // https://www.postgresql.org/docs/current/catalog-pg-description.html: stores optional descriptions (comments) for each database object.
    // https://www.postgresql.org/docs/current/catalog-pg-class.html: catalogs tables and most everything else that has columns or is otherwise similar to a table. This includes indexes (but see also pg_index), sequences (but see also pg_sequence), views, materialized views, composite types, and TOAST tables; see relkind.
    // https://www.postgresql.org/docs/current/catalog-pg-namespace.html: stores namespaces. A namespace is the structure underlying SQL schemas: each namespace can have a separate collection of relations, types, etc. without name conflicts.
    // https://www.postgresql.org/docs/current/catalog-pg-attribute.html: stores information about table columns. There will be exactly one row for every column in every table in the database.
    return await client.query<RawComment>(
        `SELECT n.nspname AS table_schema, c.relname AS table_name, a.attname AS column_name, d.description
         FROM pg_description d
                  JOIN pg_class c ON c.oid = d.objoid
                  JOIN pg_namespace n ON n.oid = c.relnamespace
                  LEFT OUTER JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = d.objsubid
         WHERE c.relkind IN ('r', 'v', 'm')
           AND ${filterSchema('n.nspname', schema)}`
    ).then(res => res.rows)
}

interface RawRelation {
    constraint_name: string
    table_schema: string
    table_name: string
    columns: number[]
    target_schema: string
    target_table: string
    target_columns: number[]
}

async function getRelations(client: Client, schema: SchemaName | undefined): Promise<RawRelation[]> {
    // https://www.postgresql.org/docs/current/catalog-pg-constraint.html: stores check, primary key, unique, foreign key, and exclusion constraints on tables. Not-null constraints are represented in the pg_attribute catalog, not here.
    // https://www.postgresql.org/docs/current/catalog-pg-class.html: catalogs tables and most everything else that has columns or is otherwise similar to a table. This includes indexes (but see also pg_index), sequences (but see also pg_sequence), views, materialized views, composite types, and TOAST tables; see relkind.
    // https://www.postgresql.org/docs/current/catalog-pg-namespace.html: stores namespaces. A namespace is the structure underlying SQL schemas: each namespace can have a separate collection of relations, types, etc. without name conflicts.
    return await client.query<RawRelation>(
        `SELECT cn.conname as constraint_name
              , n.nspname  as table_schema
              , c.relname  as table_name
              , cn.conkey  as columns
              , tn.nspname as target_schema
              , tc.relname as target_table
              , cn.confkey as target_columns
         FROM pg_constraint cn
                  JOIN pg_class c on c.oid = cn.conrelid
                  JOIN pg_namespace n ON n.oid = c.relnamespace
                  JOIN pg_class tc on tc.oid = cn.confrelid
                  JOIN pg_namespace tn on tn.oid = tc.relnamespace
         WHERE cn.contype IN ('f')
           AND ${filterSchema('n.nspname', schema)};`
    ).then(res => res.rows)
}

function filterSchema(field: string, schema: SchemaName | undefined) {
    return `${field} ${schema ? `IN ('${schema}')` : `NOT IN ('information_schema', 'pg_catalog')`}`
}
