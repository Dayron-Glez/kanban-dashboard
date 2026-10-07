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

const ColumnTitleSchema = z.string().trim().min(1)

export const CreateColumnInputSchema = z.object({
  projectId: z.uuid(),
  title: ColumnTitleSchema,
  category: ColumnCategorySchema.optional(),
})
export type CreateColumnInput = z.infer<typeof CreateColumnInputSchema>

export const RenameColumnInputSchema = z.object({ title: ColumnTitleSchema })
export type RenameColumnInput = z.infer<typeof RenameColumnInputSchema>

export const SetColumnCategoryInputSchema = z.object({ category: ColumnCategorySchema })
export type SetColumnCategoryInput = z.infer<typeof SetColumnCategoryInputSchema>

/** El orden final de las columnas del proyecto. */
export const ReorderColumnsInputSchema = z.object({ orderedColumnIds: z.array(z.uuid()) })
export type ReorderColumnsInput = z.infer<typeof ReorderColumnsInputSchema>

/** Las columnas con las que nace un proyecto, en orden. */
export const DEFAULT_COLUMNS: readonly { title: string; category: ColumnCategory }[] = [
  { title: "Pendiente", category: "todo" },
  { title: "Listo", category: "todo" },
  { title: "En curso", category: "doing" },
  { title: "En revisión", category: "doing" },
  { title: "Hecho", category: "done" },
]
