import * as z from "zod"
import { MemberRoleSchema, ProjectKindSchema } from "./enums.js"

export const ProjectSchema = z.object({
  id: z.uuid(),
  ownerId: z.uuid(),
  kind: ProjectKindSchema,
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

const ProjectNameSchema = z.string().trim().min(1)

export const CreateProjectInputSchema = z.object({
  name: ProjectNameSchema,
  kind: ProjectKindSchema.optional(),
  description: z.string().nullish(),
  color: z.string(),
})
export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>

export const RenameProjectInputSchema = z.object({ name: ProjectNameSchema })
export type RenameProjectInput = z.infer<typeof RenameProjectInputSchema>

export const SetFavoriteInputSchema = z.object({ isFavorite: z.boolean() })
export type SetFavoriteInput = z.infer<typeof SetFavoriteInputSchema>
