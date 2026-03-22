import { z } from 'zod'
import {
  sqliteTable,
  text,
  integer,
  type SQLiteColumnBuilderBase,
} from 'drizzle-orm/sqlite-core'
import type {
  SQLiteTimestampBuilderInitial,
  SQLiteBooleanBuilderInitial,
} from 'drizzle-orm/sqlite-core/columns/integer'

/**
 * REGLA DE ARQUITECTURA: Tipado Basado en Contratos.
 * Extraemos el tipo de las columnas directamente del segundo parámetro de sqliteTable
 * para garantizar compatibilidad total con la librería sin usar 'any'.
 */
type SqliteTableColumns = Record<string, SQLiteColumnBuilderBase>;

/**
 * Type representing the internal definition structure of Zod types.
 */
type ZodDef = {
  readonly typeName?: string;
  readonly defaultValue?: () => unknown;
};

/**
 * Mapa de tipos Zod a funciones de Drizzle.
 */
/* eslint-disable @typescript-eslint/no-explicit-any --
   dynamic builder map; type safety enforced by ZodShapeToBuilders<T> */
const ZOD_TYPE_MAPPING: Record<string, (name: string) => any> = {
  /* eslint-enable @typescript-eslint/no-explicit-any */
  ZodString: (name: string) => text(name),
  ZodNumber: (name: string) => integer(name),
  ZodBoolean: (name: string) => integer(name, { mode: 'boolean' }),
  ZodDate: (name: string) => integer(name, { mode: 'timestamp' }),
} as const

/**
 * Tipado dinámico para los overrides de las columnas de base de datos.
 */
export type DbColumnOverrides = Record<string, unknown>

/**
 * Recursively unwraps Zod types to find the base type and metadata.
 *
 * This helper traverses through optional, nullable, and default wrappers
 * to extract the underlying Zod type and its associated constraints.
 *
 * @param zodType - The Zod type to unwrap.
 * @returns An object with the unwrapped type, optionality, and default value.
 */
type UnwrapZodResult = {
  readonly unwrapped: z.ZodTypeAny;
  readonly isOptional: boolean;
  readonly defaultValue?: unknown;
}

const unwrapZod: (zodType: z.ZodTypeAny) => UnwrapZodResult = (
  zodType: z.ZodTypeAny,
): UnwrapZodResult => {
  let current: z.ZodTypeAny = zodType
  let isOptional: boolean = false
  let defaultValue: unknown = undefined

  while (
    current instanceof z.ZodOptional ||
    current instanceof z.ZodNullable ||
    current instanceof z.ZodDefault
  ) {
    if (current instanceof z.ZodOptional || current instanceof z.ZodNullable) {
      isOptional = true
      current = current.unwrap() as z.ZodTypeAny
    }
    if (current instanceof z.ZodDefault) {
      defaultValue = current._def.defaultValue()
      current = current._def.innerType as z.ZodTypeAny
    }
  }

  return { unwrapped: current, isOptional, defaultValue }
}

/**
 * Type-level Zod → Drizzle builder mapping.
 *
 * These utilities mirror the runtime ZOD_TYPE_MAPPING and unwrapZod logic
 * at the type level, allowing sqliteTable to infer correct column types
 * from the Zod schema. This eliminates the need for 'as any' in the
 * zodToSqliteTable return and enables proper InferSelectModel inference.
 */

/**
 * Recursively unwraps Zod wrappers (Optional, Nullable, Default) at the type level.
 */
type UnwrapZod<T extends z.ZodTypeAny> =
  T extends z.ZodOptional<infer U extends z.ZodTypeAny> ? UnwrapZod<U> :
  T extends z.ZodNullable<infer U extends z.ZodTypeAny> ? UnwrapZod<U> :
  T extends z.ZodDefault<infer U extends z.ZodTypeAny> ? UnwrapZod<U> :
  T

/**
 * Checks whether a Zod field is optional at the top level.
 * Mirrors the runtime unwrapZod logic: ZodOptional and ZodNullable set isOptional,
 * ZodDefault does NOT (it provides a value, so notNull still applies).
 */
type IsOptionalZod<T extends z.ZodTypeAny> =
  T extends z.ZodOptional<any> ? true : // eslint-disable-line @typescript-eslint/no-explicit-any
  T extends z.ZodNullable<any> ? true : // eslint-disable-line @typescript-eslint/no-explicit-any
  T extends z.ZodDefault<infer U extends z.ZodTypeAny> ? IsOptionalZod<U> :
  false

/**
 * Maps a base Zod type to the corresponding Drizzle column builder.
 * Matches the runtime ZOD_TYPE_MAPPING keys: ZodString, ZodNumber, ZodBoolean, ZodDate.
 */
type ZodBaseToBuilder<T extends z.ZodTypeAny> =
  UnwrapZod<T> extends z.ZodNumber ? ReturnType<typeof integer> :
  UnwrapZod<T> extends z.ZodBoolean ? SQLiteBooleanBuilderInitial<''> :
  UnwrapZod<T> extends z.ZodDate ? SQLiteTimestampBuilderInitial<''> :
  ReturnType<typeof text>

/**
 * Applies the Drizzle notNull modifier at the type level.
 * Drizzle's NotNull<T> adds { _: { notNull: true } } to the builder.
 */
type WithNotNull<T> = T & { _: { notNull: true } }

/**
 * Complete type-level mapping for a single Zod field.
 * Required fields get notNull, optional fields remain nullable.
 */
type ZodFieldToBuilder<T extends z.ZodTypeAny> =
  IsOptionalZod<T> extends true
    ? ZodBaseToBuilder<T>
    : WithNotNull<ZodBaseToBuilder<T>>

/**
 * Maps an entire Zod shape to its Drizzle column builder record.
 * This is the type-level bridge between Zod and Drizzle's InferSelectModel.
 */
type ZodShapeToBuilders<T extends z.ZodRawShape> = {
  [K in keyof T & string]: ZodFieldToBuilder<T[K]>
}

/**
 * Params for creating columns from a Zod object.
 */
export type CreateColumnsParams<T extends z.ZodRawShape> = {
  readonly zodObject: z.ZodObject<T>;
  readonly overrides?: Partial<Record<keyof T, DbColumnOverrides>>;
};

/**
 * Generates the column object for Drizzle from a Zod Schema.
 *
 * This function maps Zod types (String, Number, Date, etc.) to their equivalent
 * Drizzle SQLite columns, applying 'notNull' and 'default' constraints automatically
 * based on the Zod definition.
 *
 * @param params - The input parameters including zodObject and optional overrides.
 * @returns A mapping of column names to Drizzle column builders.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const createColumnsFromZod = <T extends z.ZodRawShape>(
  params: CreateColumnsParams<T>,
): SqliteTableColumns => {
  const { zodObject, overrides = {} }: CreateColumnsParams<T> = params
  const shape: T = zodObject.shape
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns: Record<string, any> = {}

  Object.entries(shape).forEach(([key, zodType]: [string, z.ZodTypeAny]) => {
    const { unwrapped, isOptional, defaultValue }: UnwrapZodResult = unwrapZod(zodType)

    // Type Extraction safe from Zod internal _def
    const def: ZodDef = unwrapped._def as ZodDef
    const typeName: string = def?.typeName || unwrapped.constructor.name

    const builderFn: (name: string) => SQLiteColumnBuilderBase =
      ZOD_TYPE_MAPPING[typeName] || ZOD_TYPE_MAPPING.ZodString

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let column: any = builderFn(key)

    if (!isOptional && column && typeof column.notNull === 'function') {
      column = column.notNull()
    }

    if (defaultValue !== undefined && column && typeof column.default === 'function') {
      column = column.default(defaultValue)
    }

    // Aplicamos Overrides (ej: primaryKey, unique, autoIncrement)
    const colOverrides: DbColumnOverrides | undefined = overrides[key]
    if (colOverrides && column) {
      Object.entries(colOverrides).forEach(([methodName, value]: [string, unknown]) => {
        if (typeof column[methodName] === 'function') {
          if (value === true) {
            column = column[methodName]()
          } else if (value !== false && value !== undefined) {
            column = column[methodName](value)
          }
        }
      })
    }

    columns[key] = column
  })

  return columns as SqliteTableColumns
}

/**
 * Params for generating a SQLite table from a Zod object.
 */
export type ZodToSqliteTableParams<T extends z.ZodRawShape> = {
  readonly tableName: string;
  readonly zodObject: z.ZodObject<T>;
  readonly overrides?: Partial<Record<keyof T, DbColumnOverrides>>;
};

/**
 * Generates a SQLite table from a ZodObject with full type preservation.
 *
 * This is the main entry point for creating Drizzle table definitions from Zod
 * schemas. It ensures that the resulting Drizzle table maintains the same
 * property names and basic types as the Zod object, facilitating cross-layer
 * type safety without manual duplication.
 *
 * @param params - The input parameters including table name and Zod object.
 * @returns A Drizzle SQLite table definition.
 */
/* eslint-disable @typescript-eslint/typedef,
   @typescript-eslint/explicit-function-return-type --
   return type inferred from sqliteTable for InferSelectModel */
export const zodToSqliteTable = <T extends z.ZodRawShape>(
  params: ZodToSqliteTableParams<T>,
) => {
  /* eslint-enable @typescript-eslint/typedef,
     @typescript-eslint/explicit-function-return-type */
  const { tableName, zodObject, overrides }: ZodToSqliteTableParams<T> = params
  const finalTableName: string = zodObject.description || tableName
  const columns: SqliteTableColumns = createColumnsFromZod({ zodObject, overrides })

  // Type bridge: columns are built dynamically from Zod at runtime.
  // ZodShapeToBuilders<T> mirrors the runtime mapping at the type level,
  // enabling Drizzle's InferSelectModel to infer correct row types.
  return sqliteTable(finalTableName, columns as ZodShapeToBuilders<T>)
}
