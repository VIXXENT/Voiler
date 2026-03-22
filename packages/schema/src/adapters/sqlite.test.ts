import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { zodToSqliteTable } from './sqlite.js'

describe('zodToSqliteTable', (): void => {
  it('should generate a native Drizzle table from a ZodObject', (): void => {
    const TestSchema: z.ZodObject<{ id: z.ZodNumber; name: z.ZodString }> = z.object({
      id: z.number(),
      name: z.string(),
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const table: any = zodToSqliteTable({
      tableName: 'test_table',
      zodObject: TestSchema,
      overrides: {
        id: { primaryKey: true, autoIncrement: true },
      },
    })

    expect(table).toBeDefined()
    expect(table.id).toBeDefined()
    expect(table.name).toBeDefined()

    // Verificamos si tiene las propiedades de una tabla nativa de Drizzle
    expect(table.id.name).toBe('id')
    expect(table.name.name).toBe('name')
  })

  it('should respect optional fields (NULL vs NOT NULL)', (): void => {
    const OptionalSchema: z.ZodObject<{
      opt: z.ZodOptional<z.ZodString>;
      req: z.ZodString
    }> = z.object({
      opt: z.string().optional(),
      req: z.string(),
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const table: any = zodToSqliteTable({
      tableName: 'optional_table',
      zodObject: OptionalSchema,
    })

    expect(table.opt.notNull).toBe(false)
    expect(table.req.notNull).toBe(true)
  })
})
