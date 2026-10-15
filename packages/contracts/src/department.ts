import * as z from "zod"

export const DepartmentSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  name: z.string(),
  position: z.number().int().nonnegative(),
})
export type Department = z.infer<typeof DepartmentSchema>
