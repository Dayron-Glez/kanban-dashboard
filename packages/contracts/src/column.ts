import * as z from "zod"

export const ColumnSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  title: z.string(),
  position: z.number().int().nonnegative(),
})
export type Column = z.infer<typeof ColumnSchema>
