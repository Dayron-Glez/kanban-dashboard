import * as z from "zod"

/** Una persona del equipo del proyecto, con o sin cuenta. */
export const CrewMemberSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  fullName: z.string(),
  email: z.email().nullable(),
  departmentId: z.uuid().nullable(),
})
export type CrewMember = z.infer<typeof CrewMemberSchema>

export const CreateCrewMemberInputSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  email: z.email().nullable().optional(),
  departmentId: z.uuid().nullable().optional(),
})
export type CreateCrewMemberInput = z.infer<typeof CreateCrewMemberInputSchema>

export const UpdateCrewMemberInputSchema = CreateCrewMemberInputSchema.partial().refine(
  (input) => Object.keys(input).length > 0
)
export type UpdateCrewMemberInput = z.infer<typeof UpdateCrewMemberInputSchema>
