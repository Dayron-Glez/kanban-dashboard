import * as z from "zod"

export const ColumnSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  title: z.string(),
  position: z.number().int().nonnegative(),
})
export type Column = z.infer<typeof ColumnSchema>

export const CreateColumnInputSchema = z.object({
  projectId: z.uuid(),
  title: z.string(),
})
export type CreateColumnInput = z.infer<typeof CreateColumnInputSchema>
