import { sql } from "drizzle-orm"
import {
  check,
  date,
  foreignKey,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import { users } from "./identity.js"
import { projects } from "./projects.js"

export const columns = pgTable(
  "columns",
  {
    id: uuid().defaultRandom().primaryKey(),
    projectId: uuid("project_id").notNull(),
    title: text().notNull(),
    position: integer().default(0).notNull(),
    category: text().default("todo").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: "columns_project_id_fkey",
    }).onDelete("cascade"),
    uniqueIndex("columns_one_done_per_project")
      .on(table.projectId)
      .where(sql`${table.category} = 'done'`),
    check("columns_category_check", sql`${table.category} in ('todo', 'doing', 'blocked', 'done')`),
  ]
)

export const tasks = pgTable(
  "tasks",
  {
    id: uuid().defaultRandom().primaryKey(),
    projectId: uuid("project_id").notNull(),
    columnId: uuid("column_id").notNull(),
    assigneeId: uuid("assignee_id"),
    content: text().notNull(),
    priority: text().default("p2").notNull(),
    size: text().default("m").notNull(),
    position: integer().default(0).notNull(),
    dueDate: date("due_date"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: "tasks_project_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.columnId],
      foreignColumns: [columns.id],
      name: "tasks_column_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.assigneeId],
      foreignColumns: [users.id],
      name: "tasks_assignee_id_fkey",
    }).onDelete("set null"),
    check("tasks_priority_check", sql`${table.priority} in ('p0', 'p1', 'p2')`),
    check("tasks_size_check", sql`${table.size} in ('xs', 's', 'm', 'l', 'xl')`),
  ]
)

export const taskHistory = pgTable(
  "task_history",
  {
    id: uuid().defaultRandom().primaryKey(),
    taskId: uuid("task_id").notNull(),
    fromColumnId: uuid("from_column_id"),
    toColumnId: uuid("to_column_id").notNull(),
    movedAt: timestamp("moved_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.taskId],
      foreignColumns: [tasks.id],
      name: "task_history_task_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.fromColumnId],
      foreignColumns: [columns.id],
      name: "task_history_from_column_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.toColumnId],
      foreignColumns: [columns.id],
      name: "task_history_to_column_id_fkey",
    }).onDelete("cascade"),
  ]
)
