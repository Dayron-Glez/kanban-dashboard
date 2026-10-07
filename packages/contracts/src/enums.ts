import * as z from "zod"

export const MEMBER_ROLES = ["owner", "member"] as const
export const MemberRoleSchema = z.enum(MEMBER_ROLES)
export type MemberRole = z.infer<typeof MemberRoleSchema>

export const INVITATION_STATUSES = ["pending", "accepted"] as const
export const InvitationStatusSchema = z.enum(INVITATION_STATUSES)
export type InvitationStatus = z.infer<typeof InvitationStatusSchema>

export const TASK_PRIORITIES = ["p0", "p1", "p2"] as const
export const TaskPrioritySchema = z.enum(TASK_PRIORITIES)
export type TaskPriority = z.infer<typeof TaskPrioritySchema>

export const TASK_SIZES = ["xs", "s", "m", "l", "xl"] as const
export const TaskSizeSchema = z.enum(TASK_SIZES)
export type TaskSize = z.infer<typeof TaskSizeSchema>

export const COLUMN_CATEGORIES = ["todo", "doing", "blocked", "done"] as const
export const ColumnCategorySchema = z.enum(COLUMN_CATEGORIES)
export type ColumnCategory = z.infer<typeof ColumnCategorySchema>
