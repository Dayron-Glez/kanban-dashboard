import * as z from "zod"
import { MemberRoleSchema } from "./enums.js"

export const ProjectSchema = z.object({
  id: z.uuid(),
  ownerId: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  color: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
})
export type Project = z.infer<typeof ProjectSchema>

export const ProjectSummarySchema = ProjectSchema.extend({
  role: MemberRoleSchema,
  isFavorite: z.boolean(),
  taskCount: z.number().int().nonnegative(),
})
export type ProjectSummary = z.infer<typeof ProjectSummarySchema>

export const CreateProjectInputSchema = z.object({
  name: z.string(),
  description: z.string().nullish(),
  color: z.string(),
})
export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>
