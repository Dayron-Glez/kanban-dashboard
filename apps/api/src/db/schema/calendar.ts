import { sql } from "drizzle-orm"
import {
  check,
  foreignKey,
  index,
  integer,
  pgSchema,
  text,
  timestamp,
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
  ]
)
