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
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
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
    index("elements_project_id_idx").on(table.projectId),
    index("elements_parent_id_idx").on(table.parentId),
    check(
      "elements_kind_check",
      sql`${table.kind} in ('phase', 'subphase', 'process', 'event', 'task', 'meeting', 'reminder', 'hiring')`
    ),
    check("elements_position_check", sql`${table.position} >= 0`),
    check("elements_parent_check", sql`(${table.parentId} is null) = (${table.kind} = 'phase')`),
    check(
      "elements_duration_check",
      sql`(${table.durationAmount} is null) = (${table.durationUnit} is null) and ${table.durationAmount} > 0 and ${table.durationUnit} in ('days', 'weeks', 'months')`
    ),
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
