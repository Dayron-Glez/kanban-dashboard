import * as z from "zod"

export const PROJECT_KINDS = ["film", "series", "documentary"] as const
export const ProjectKindSchema = z.enum(PROJECT_KINDS)
export type ProjectKind = z.infer<typeof ProjectKindSchema>

export const ELEMENT_KINDS = [
  "phase",
  "subphase",
  "process",
  "event",
  "task",
  "meeting",
  "reminder",
  "hiring",
  "travel",
] as const
export const ElementKindSchema = z.enum(ELEMENT_KINDS)
export type ElementKind = z.infer<typeof ElementKindSchema>

/** Lo que se planifica dentro de una fase, subfase o proceso. */
export const ACTION_KINDS = ["event", "task", "meeting", "reminder", "hiring", "travel"] as const
export const ActionKindSchema = z.enum(ACTION_KINDS)
export type ActionKind = z.infer<typeof ActionKindSchema>

/** Las acciones de un solo día: reuniones y recordatorios. */
export const SINGLE_DAY_ACTION_KINDS: readonly ActionKind[] = ["meeting", "reminder"]

/** De qué puede colgar una acción. */
export const ACTION_PARENT_KINDS: readonly ElementKind[] = ["phase", "subphase", "process"]

export const DURATION_UNITS = ["days", "weeks", "months"] as const
export const DurationUnitSchema = z.enum(DURATION_UNITS)
export type DurationUnit = z.infer<typeof DurationUnitSchema>

export const DATE_POINTS = ["start", "end"] as const
export const DatePointSchema = z.enum(DATE_POINTS)
export type DatePoint = z.infer<typeof DatePointSchema>

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

export const HOURS_MODES = ["daily", "continuous"] as const
export const HoursModeSchema = z.enum(HOURS_MODES)
export type HoursMode = z.infer<typeof HoursModeSchema>

export const ALERT_CAUSES = [
  "unavailability",
  "illness",
  "strike",
  "weather",
  "permits",
  "supplier",
  "other",
] as const
export const AlertCauseSchema = z.enum(ALERT_CAUSES)
export type AlertCause = z.infer<typeof AlertCauseSchema>

export const ALERT_CERTAINTIES = ["confirmed", "possible"] as const
export const AlertCertaintySchema = z.enum(ALERT_CERTAINTIES)
export type AlertCertainty = z.infer<typeof AlertCertaintySchema>

export const ALERT_SCOPES = ["project", "targeted"] as const
export const AlertScopeSchema = z.enum(ALERT_SCOPES)
export type AlertScope = z.infer<typeof AlertScopeSchema>

/** Solo sirve para resolver conflictos entre acciones que se solapan. */
export const ACTION_PRIORITIES = ["high", "normal", "low"] as const
export const ActionPrioritySchema = z.enum(ACTION_PRIORITIES)
export type ActionPriority = z.infer<typeof ActionPrioritySchema>

export const VIDEO_APPS = ["meet", "teams", "zoom", "webex", "other"] as const
export const VideoAppSchema = z.enum(VIDEO_APPS)
export type VideoApp = z.infer<typeof VideoAppSchema>
