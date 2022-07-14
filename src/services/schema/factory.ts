import {DatabaseUrl} from "@/types/basics";
import {SchemaExtractor} from "@/services/schema/extractor";
import {PostgresSchemaExtractor} from "@/services/schema/postgres";

export function getSchemaExtractor(url: DatabaseUrl): Promise<SchemaExtractor> {
    if (url.startsWith('postgres')) {
        return PostgresSchemaExtractor.fromUrl(url)
    } else {
        return Promise.reject('Not recognized url')
    }
}
