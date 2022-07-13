import {DatabaseSchema, SchemaExtractor} from "@/services/schema/extractor";
import {DatabaseUrl} from "@/types/basics";
import {Client, ClientConfig} from "pg";
import {groupBy} from "@/utils/array";
import {SchemaName, TableId} from "@/types/project";

// https://www.postgresql.org/docs/current/information-schema.html
// https://www.postgresql.org/docs/current/catalogs.html
export class PostgresSchemaExtractor implements SchemaExtractor {
    static fromUrl(url: DatabaseUrl): Promise<PostgresSchemaExtractor> {
        return parseUrl(url).then(c => new PostgresSchemaExtractor(new Client(c)))
    }

    constructor(private readonly client: Client) {
    }

    getSchema(schema: SchemaName | undefined): Promise<DatabaseSchema> {
        return this.connect(async client => {
            const columns = await getColumns(client, schema).then(cols => groupBy(cols, toTableId))
            const primaryKeys = await getPrimaryKeys(client, schema).then(cols => groupBy(cols, toTableId))
            const uniques = await getUniques(client, schema).then(cols => groupBy(cols, toTableId))
            const comments = await getComments(client, schema).then(cols => groupBy(cols, toTableId))
            const relations = await getRelations(client, schema)
            return {
                tables: Object.entries(columns).map(([tableId, columns]) => {
                    const tablePrimaryKey = primaryKeys[tableId] || []
                    const tableUniques = groupBy(uniques[tableId] || [], u => u.constraint_name)
                    const tableComments = comments[tableId] || []
                    return {
                        schema: columns[0].table_schema,
                        table: columns[0].table_name,
                        view: columns[0].table_type === 'VIEW',
                        columns: columns
                            .sort((a, b) => a.ordinal_position - b.ordinal_position)
                            .map(col => ({
                                name: col.column_name,
                                type: col.data_type + (col.character_maximum_length ? `(${col.character_maximum_length})` : ''),
                                nullable: col.is_nullable === 'YES',
                                default: col.column_default,
                                comment: tableComments.find(c => c.column_name === col.column_name)?.description || null
                            })),
                        primaryKey: tablePrimaryKey.length > 0 ? {
                            name: tablePrimaryKey[0].constraint_name,
                            columns: tablePrimaryKey.map(c => c.column_name)
                        } : null,
                        uniques: Object.entries(tableUniques).map(([name, cols]) => ({
                            name: name,
                            columns: cols.map(c => c.column_name),
                            definition: null
                        })),
                        indexes: [],
                        checks: [],
                        comment: tableComments.find(c => c.column_name === null)?.description || null
                    }
                }),
                relations: relations.map(r => ({
                    name: r.constraint_name,
                    src: {schema: r.table_schema, table: r.table_name, column: r.column_name},
                    ref: {schema: r.foreign_table_schema, table: r.foreign_table_name, column: r.foreign_column_name},
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
    table_type: 'BASE TABLE' | 'VIEW' | 'FOREIGN' | 'LOCAL TEMPORARY'
    column_name: string
    ordinal_position: number
    column_default: string | null
    is_nullable: 'YES' | 'NO'
    data_type: string
    character_maximum_length: number | null
}

async function getColumns(client: Client, schema: SchemaName | undefined): Promise<RawColumn[]> {
    // https://www.postgresql.org/docs/current/infoschema-tables.html: contains all tables and views defined in the current database
    // https://www.postgresql.org/docs/current/infoschema-columns.html: contains information about all table columns (or view columns) in the database
    return await client.query<RawColumn>(
        `SELECT t.table_schema,
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
                            ON t.table_catalog = c.table_catalog AND t.table_schema = c.table_schema AND
                               t.table_name = c.table_name
         WHERE t.TABLE_TYPE IN ('BASE TABLE', 'VIEW')
           AND t.table_schema ${schema ? `IN ('${schema}')` : `NOT IN ('information_schema', 'pg_catalog')`}`
    ).then(res => res.rows)
}

interface RawPrimaryKey {
    constraint_name: string
    table_schema: string
    table_name: string
    column_name: string
}

async function getPrimaryKeys(client: Client, schema: SchemaName | undefined): Promise<RawPrimaryKey[]> {
    // https://www.postgresql.org/docs/current/infoschema-table-constraints.html: contains all constraints belonging to tables that has some privilege other than SELECT on
    // https://www.postgresql.org/docs/current/infoschema-constraint-column-usage.html: identifies all columns that are used by some constraint. For primary key constraint, this view identifies the constrained columns
    return await client.query<RawPrimaryKey>(
        `SELECT tc.constraint_name, tc.table_schema, tc.table_name, ccu.column_name
         FROM information_schema.table_constraints as tc
                  JOIN information_schema.constraint_column_usage AS ccu
                       ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
         WHERE tc.constraint_type = 'PRIMARY KEY'
           AND tc.table_schema ${schema ? `IN ('${schema}')` : `NOT IN ('information_schema', 'pg_catalog')`}`
    ).then(res => res.rows)
}

interface RawUnique {
    constraint_name: string
    table_schema: string
    table_name: string
    column_name: string
}

async function getUniques(client: Client, schema: SchemaName | undefined): Promise<RawUnique[]> {
    // https://www.postgresql.org/docs/current/infoschema-table-constraints.html: contains all constraints belonging to tables that has some privilege other than SELECT on
    // https://www.postgresql.org/docs/current/infoschema-constraint-column-usage.html: identifies all columns that are used by some constraint. For primary key constraint, this view identifies the constrained columns
    return await client.query<RawUnique>(
        `SELECT tc.constraint_name, tc.table_schema, tc.table_name, ccu.column_name
         FROM information_schema.table_constraints as tc
                  JOIN information_schema.constraint_column_usage AS ccu
                       ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
         WHERE tc.constraint_type = 'UNIQUE'
           AND tc.table_schema ${schema ? `IN ('${schema}')` : `NOT IN ('information_schema', 'pg_catalog')`}`
    ).then(res => res.rows)
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
           AND n.nspname ${schema ? `IN ('${schema}')` : `NOT IN ('information_schema', 'pg_catalog')`}`
    ).then(res => res.rows)
}

interface RawRelation {
    table_schema: string
    table_name: string
    column_name: string
    constraint_name: string
    foreign_table_schema: string
    foreign_table_name: string
    foreign_column_name: string
}

async function getRelations(client: Client, schema: SchemaName | undefined): Promise<RawRelation[]> {
    // https://www.postgresql.org/docs/current/infoschema-table-constraints.html: contains all constraints belonging to tables that has some privilege other than SELECT on
    // https://www.postgresql.org/docs/current/infoschema-key-column-usage.html: identifies all columns that are restricted by unique, primary key, or foreign key constraint. Check constraints are not included
    // https://www.postgresql.org/docs/current/infoschema-constraint-column-usage.html: identifies all columns that are used by some constraint
    //  - For a check constraint, this identifies the columns that are used in the check expression
    //  - For a foreign key constraint, this identifies the columns that the foreign key references
    //  - For a unique or primary key constraint, this view identifies the constrained columns
    // TODO: migrate to https://dba.stackexchange.com/questions/36979/retrieving-all-pk-and-fk
    // discussion: https://stackoverflow.com/questions/1152260/how-to-list-table-foreign-keys
    return await client.query<RawRelation>(
        `SELECT tc.table_schema,
                tc.table_name,
                kcu.column_name,
                tc.constraint_name,
                ccu.table_schema AS foreign_table_schema,
                ccu.table_name   AS foreign_table_name,
                ccu.column_name  AS foreign_column_name
         FROM information_schema.table_constraints AS tc
                  JOIN information_schema.key_column_usage AS kcu
                       ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
                  JOIN information_schema.constraint_column_usage AS ccu
                       ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
         WHERE tc.constraint_type = 'FOREIGN KEY'
           AND tc.table_schema ${schema ? `IN ('${schema}')` : `NOT IN ('information_schema', 'pg_catalog')`}`
    ).then(res => res.rows)
}
