import * as z from "zod"
import { ColumnCategorySchema, type ColumnCategory } from "./enums.js"

export const ColumnSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  title: z.string(),
  position: z.number().int().nonnegative(),
  category: ColumnCategorySchema,
})
export type Column = z.infer<typeof ColumnSchema>

export const CreateColumnInputSchema = z.object({
  projectId: z.uuid(),
  title: z.string(),
  category: ColumnCategorySchema.optional(),
})
export type CreateColumnInput = z.infer<typeof CreateColumnInputSchema>

/** Las columnas con las que nace un proyecto, en orden. */
export const DEFAULT_COLUMNS: readonly { title: string; category: ColumnCategory }[] = [
  { title: "Pendiente", category: "todo" },
  { title: "Listo", category: "todo" },
  { title: "En curso", category: "doing" },
  { title: "En revisión", category: "doing" },
  { title: "Hecho", category: "done" },
]
