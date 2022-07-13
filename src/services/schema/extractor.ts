import {ColumnName, ColumnType, RelationName, SchemaName, TableName} from "@/types/project";

export interface SchemaExtractor {
    getSchema(schema: SchemaName | undefined): Promise<DatabaseSchema>
}

export interface DatabaseSchema {
    tables: Table[]
    relations: Relation[]
}

export interface Table {
    schema: SchemaName
    table: TableName
    view: boolean
    columns: Column[]
    primaryKey: PrimaryKey | null
    uniques: Unique[]
    indexes: Index[]
    checks: Check[]
    comment: string | null
}

export interface PrimaryKey {
    name: string | null
    columns: ColumnName[]
}

export interface Unique {
    name: string
    columns: ColumnName[]
    definition: string | null
}

export interface Index {
    name: string
    columns: ColumnName[]
    definition: string | null
}

export interface Check {
    name: string
    columns: ColumnName[]
    predicate: string | null
}

export interface Column {
    name: ColumnName
    type: ColumnType
    nullable: boolean
    default: string | null
    comment: string | null
}


export interface Relation {
    name: RelationName
    src: ColumnRef
    ref: ColumnRef
}

export interface ColumnRef {
    schema: SchemaName
    table: TableName
    column: ColumnName
}

