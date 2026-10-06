import * as z from "zod"

export const MEMBER_ROLES = ["owner", "member"] as const
export const MemberRoleSchema = z.enum(MEMBER_ROLES)
export type MemberRole = z.infer<typeof MemberRoleSchema>
