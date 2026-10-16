import { sql } from "drizzle-orm"
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  numeric,
  pgSchema,
  primaryKey,
  text,
  time,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import { alerts } from "./alerts.js"
import { users } from "./identity.js"
import { projects } from "./projects.js"

export const calendar = pgSchema("calendar")

export const elements = calendar.table(
  "elements",
  {
    id: uuid()
      .default(sql`uuidv7()`)
      .primaryKey(),
    projectId: uuid("project_id").notNull(),
    kind: text().notNull(),
    parentId: uuid("parent_id"),
    position: integer().default(0).notNull(),
    name: text().notNull(),
    color: text(),
    templateKey: text("template_key"),
    durationAmount: numeric("duration_amount", { mode: "number" }),
    durationUnit: text("duration_unit"),
    startsOn: date("starts_on"),
    endsOn: date("ends_on"),
    isAnchor: boolean("is_anchor").default(false).notNull(),
    isPinned: boolean("is_pinned").default(false).notNull(),
    priority: text().default("normal").notNull(),
    allDay: boolean("all_day").default(true).notNull(),
    startTime: time("start_time"),
    endTime: time("end_time"),
    hoursMode: text("hours_mode"),
    location: text(),
    notes: text(),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "string" }),
    completedBy: uuid("completed_by"),
    videoApp: text("video_app"),
    videoUrl: text("video_url"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: "elements_project_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: "elements_parent_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.completedBy],
      foreignColumns: [users.id],
      name: "elements_completed_by_fkey",
    }).onDelete("set null"),
    index("elements_project_id_idx").on(table.projectId),
    index("elements_parent_id_idx").on(table.parentId),
    check(
      "elements_kind_check",
      sql`${table.kind} in ('phase', 'subphase', 'process', 'event', 'task', 'meeting', 'reminder', 'hiring', 'travel')`
    ),
    check("elements_position_check", sql`${table.position} >= 0`),
    check("elements_parent_check", sql`(${table.parentId} is null) = (${table.kind} = 'phase')`),
    check(
      "elements_duration_check",
      sql`(${table.durationAmount} is null) = (${table.durationUnit} is null) and ${table.durationAmount} > 0 and ${table.durationUnit} in ('days', 'weeks', 'months')`
    ),
    check("elements_name_check", sql`char_length(${table.name}) between 1 and 200`),
    check("elements_priority_check", sql`${table.priority} in ('high', 'normal', 'low')`),
    check("elements_hours_mode_check", sql`${table.hoursMode} in ('daily', 'continuous')`),
    check(
      "elements_all_day_check",
      sql`not ${table.allDay} or (${table.startTime} is null and ${table.endTime} is null and ${table.hoursMode} is null)`
    ),
    check("elements_start_time_check", sql`${table.allDay} or ${table.startTime} is not null`),
    check(
      "elements_daily_check",
      sql`${table.hoursMode} is distinct from 'daily' or (${table.endTime} is not null and ${table.endTime} > ${table.startTime})`
    ),
    check("elements_hiring_all_day_check", sql`${table.kind} <> 'hiring' or ${table.allDay}`),
    check(
      "elements_location_check",
      sql`${table.location} is null or char_length(${table.location}) <= 200`
    ),
    check("elements_completed_check", sql`${table.completedAt} is null or ${table.kind} = 'task'`),
    check(
      "elements_video_app_check",
      sql`${table.videoApp} in ('meet', 'teams', 'zoom', 'webex', 'other')`
    ),
    check(
      "elements_video_check",
      sql`(${table.videoApp} is null and ${table.videoUrl} is null) or (${table.kind} = 'meeting' and ${table.videoApp} is not null)`
    ),
    check("elements_video_url_check", sql`${table.videoUrl} ~ '^https?://'`),
    uniqueIndex("elements_one_anchor_per_project")
      .on(table.projectId)
      .where(sql`${table.isAnchor}`),
  ]
)

export const elementDependencies = calendar.table(
  "element_dependencies",
  {
    id: uuid()
      .default(sql`uuidv7()`)
      .primaryKey(),
    projectId: uuid("project_id").notNull(),
    predecessorId: uuid("predecessor_id").notNull(),
    successorId: uuid("successor_id").notNull(),
    predecessorPoint: text("predecessor_point").default("end").notNull(),
    successorPoint: text("successor_point").default("start").notNull(),
    lagAmount: numeric("lag_amount", { mode: "number" }).default(0).notNull(),
    lagUnit: text("lag_unit").default("days").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: "element_dependencies_project_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.predecessorId],
      foreignColumns: [elements.id],
      name: "element_dependencies_predecessor_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.successorId],
      foreignColumns: [elements.id],
      name: "element_dependencies_successor_id_fkey",
    }).onDelete("cascade"),
    unique("element_dependencies_link_key").on(
      table.predecessorId,
      table.successorId,
      table.successorPoint
    ),
    index("element_dependencies_project_id_idx").on(table.projectId),
    index("element_dependencies_successor_id_idx").on(table.successorId),
    check(
      "element_dependencies_not_self_check",
      sql`${table.predecessorId} <> ${table.successorId}`
    ),
    check(
      "element_dependencies_points_check",
      sql`${table.predecessorPoint} in ('start', 'end') and ${table.successorPoint} in ('start', 'end')`
    ),
    check(
      "element_dependencies_lag_unit_check",
      sql`${table.lagUnit} in ('days', 'weeks', 'months')`
    ),
  ]
)

export const alertConflictReviews = calendar.table(
  "alert_conflict_reviews",
  {
    alertId: uuid("alert_id").notNull(),
    elementId: uuid("element_id").notNull(),
    reviewedBy: uuid("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.alertId, table.elementId], name: "alert_conflict_reviews_pkey" }),
    foreignKey({
      columns: [table.alertId],
      foreignColumns: [alerts.id],
      name: "alert_conflict_reviews_alert_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.elementId],
      foreignColumns: [elements.id],
      name: "alert_conflict_reviews_element_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.reviewedBy],
      foreignColumns: [users.id],
      name: "alert_conflict_reviews_reviewed_by_fkey",
    }).onDelete("set null"),
    index("alert_conflict_reviews_element_id_idx").on(table.elementId),
  ]
)
