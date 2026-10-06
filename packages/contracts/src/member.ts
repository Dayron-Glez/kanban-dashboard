import * as z from "zod"
import { MemberRoleSchema } from "./enums"

export const ProfileSchema = z.object({
  id: z.uuid(),
  fullName: z.string().nullable(),
  email: z.string().nullable(),
  avatarUrl: z.string().nullable(),
})
export type Profile = z.infer<typeof ProfileSchema>

export const ProjectMemberSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  userId: z.uuid(),
  role: MemberRoleSchema,
  joinedAt: z.iso.datetime({ offset: true }),
  profile: ProfileSchema,
})
export type ProjectMember = z.infer<typeof ProjectMemberSchema>
