import * as z from "zod"
import { ColumnCategorySchema } from "./enums.js"

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
