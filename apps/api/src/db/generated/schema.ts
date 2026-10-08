import { users as identityUsers } from "../identity.js"
import {
  pgTable,
  foreignKey,
  unique,
  pgPolicy,
  check,
  uuid,
  text,
  timestamp,
  boolean,
  uniqueIndex,
  integer,
  date,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const projectMembers = pgTable(
  "project_members",
  {
    id: uuid()
      .default(sql`uuid_generate_v4()`)
      .primaryKey()
      .notNull(),
    projectId: uuid("project_id").notNull(),
    userId: uuid("user_id").notNull(),
    role: text().default("member").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
    isFavorite: boolean("is_favorite").default(false).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: "project_members_project_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [profiles.id],
      name: "project_members_user_id_fkey",
    }).onDelete("cascade"),
    unique("project_members_project_id_user_id_key").on(table.projectId, table.userId),
    pgPolicy("Miembros ven los miembros", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`is_project_member(project_id)`,
    }),
    pgPolicy("Propietario añade miembros", {
      as: "permissive",
      for: "insert",
      to: ["authenticated"],
    }),
    pgPolicy("Propietario elimina miembros", {
      as: "permissive",
      for: "delete",
      to: ["authenticated"],
    }),
    pgPolicy("Cada miembro actualiza su propia fila", {
      as: "permissive",
      for: "update",
      to: ["authenticated"],
    }),
    check("project_members_role_check", sql`role = ANY (ARRAY['owner'::text, 'member'::text])`),
  ]
)

export const columns = pgTable(
  "columns",
  {
    id: uuid()
      .default(sql`uuid_generate_v4()`)
      .primaryKey()
      .notNull(),
    projectId: uuid("project_id").notNull(),
    title: text().notNull(),
    position: integer().default(0).notNull(),
    category: text().default("todo").notNull(),
  },
  (table) => [
    uniqueIndex("columns_one_done_per_project")
      .using("btree", table.projectId.asc().nullsLast().op("uuid_ops"))
      .where(sql`(category = 'done'::text)`),
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: "columns_project_id_fkey",
    }).onDelete("cascade"),
    pgPolicy("Miembros ven columnas", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`is_project_member(project_id)`,
    }),
    pgPolicy("Propietario crea columnas", {
      as: "permissive",
      for: "insert",
      to: ["authenticated"],
    }),
    pgPolicy("Propietario actualiza columnas", {
      as: "permissive",
      for: "update",
      to: ["authenticated"],
    }),
    pgPolicy("Propietario elimina columnas", {
      as: "permissive",
      for: "delete",
      to: ["authenticated"],
    }),
    check(
      "columns_category_check",
      sql`category = ANY (ARRAY['todo'::text, 'doing'::text, 'blocked'::text, 'done'::text])`
    ),
  ]
)

export const profiles = pgTable(
  "profiles",
  {
    id: uuid().primaryKey().notNull(),
    fullName: text("full_name"),
    avatarUrl: text("avatar_url"),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    email: text(),
  },
  (table) => [
    foreignKey({
      columns: [table.id],
      foreignColumns: [identityUsers.id],
      name: "profiles_id_fkey",
    }).onDelete("cascade"),
    pgPolicy("Perfiles de quienes comparten proyecto", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`((id = auth.uid()) OR shares_project_with(id))`,
    }),
    pgPolicy("Cada usuario actualiza su perfil", {
      as: "permissive",
      for: "update",
      to: ["authenticated"],
    }),
  ]
)

export const projectInvitations = pgTable(
  "project_invitations",
  {
    id: uuid()
      .default(sql`uuid_generate_v4()`)
      .primaryKey()
      .notNull(),
    projectId: uuid("project_id").notNull(),
    email: text().notNull(),
    token: uuid()
      .default(sql`uuid_generate_v4()`)
      .notNull(),
    status: text().default("pending").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" })
      .default(sql`(now() + '7 days'::interval)`)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: "project_invitations_project_id_fkey",
    }).onDelete("cascade"),
    unique("project_invitations_token_key").on(table.token),
    pgPolicy("Miembros ven invitaciones", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`is_project_member(project_id)`,
    }),
    pgPolicy("Propietario crea invitaciones", {
      as: "permissive",
      for: "insert",
      to: ["authenticated"],
    }),
    pgPolicy("Propietario cancela invitaciones", {
      as: "permissive",
      for: "delete",
      to: ["authenticated"],
    }),
    check(
      "project_invitations_status_check",
      sql`status = ANY (ARRAY['pending'::text, 'accepted'::text])`
    ),
  ]
)

export const projects = pgTable(
  "projects",
  {
    id: uuid()
      .default(sql`uuid_generate_v4()`)
      .primaryKey()
      .notNull(),
    ownerId: uuid("owner_id").notNull(),
    name: text().notNull(),
    description: text(),
    color: text().default("#3b82f6").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.ownerId],
      foreignColumns: [identityUsers.id],
      name: "projects_owner_id_fkey",
    }).onDelete("cascade"),
    pgPolicy("Miembros ven el proyecto", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`((owner_id = auth.uid()) OR is_project_member(id))`,
    }),
    pgPolicy("Usuarios autenticados crean proyectos", {
      as: "permissive",
      for: "insert",
      to: ["authenticated"],
    }),
    pgPolicy("Propietario actualiza proyecto", {
      as: "permissive",
      for: "update",
      to: ["authenticated"],
    }),
    pgPolicy("Propietario elimina proyecto", {
      as: "permissive",
      for: "delete",
      to: ["authenticated"],
    }),
  ]
)

export const taskHistory = pgTable(
  "task_history",
  {
    id: uuid()
      .default(sql`uuid_generate_v4()`)
      .primaryKey()
      .notNull(),
    taskId: uuid("task_id").notNull(),
    fromColumnId: uuid("from_column_id"),
    toColumnId: uuid("to_column_id").notNull(),
    movedAt: timestamp("moved_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
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
    foreignKey({
      columns: [table.taskId],
      foreignColumns: [tasks.id],
      name: "task_history_task_id_fkey",
    }).onDelete("cascade"),
    pgPolicy("Miembros insertan historial", {
      as: "permissive",
      for: "insert",
      to: ["public"],
      withCheck: sql`(EXISTS ( SELECT 1
   FROM (tasks t
     JOIN project_members pm ON ((pm.project_id = t.project_id)))
  WHERE ((t.id = task_history.task_id) AND (pm.user_id = auth.uid()))))`,
    }),
    pgPolicy("Miembros ven historial", { as: "permissive", for: "select", to: ["public"] }),
  ]
)

export const tasks = pgTable(
  "tasks",
  {
    id: uuid()
      .default(sql`uuid_generate_v4()`)
      .primaryKey()
      .notNull(),
    columnId: uuid("column_id").notNull(),
    projectId: uuid("project_id").notNull(),
    assigneeId: uuid("assignee_id"),
    content: text().notNull(),
    priority: text().default("p2").notNull(),
    size: text().default("m").notNull(),
    position: integer().default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    dueDate: date("due_date"),
  },
  (table) => [
    foreignKey({
      columns: [table.columnId],
      foreignColumns: [columns.id],
      name: "tasks_column_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: "tasks_project_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.assigneeId],
      foreignColumns: [identityUsers.id],
      name: "tasks_assignee_id_fkey",
    }).onDelete("set null"),
    pgPolicy("Miembros eliminan tareas", {
      as: "permissive",
      for: "delete",
      to: ["public"],
      using: sql`is_project_member(project_id)`,
    }),
    pgPolicy("Miembros actualizan tareas", { as: "permissive", for: "update", to: ["public"] }),
    pgPolicy("Miembros crean tareas", { as: "permissive", for: "insert", to: ["public"] }),
    pgPolicy("Miembros ven tareas", { as: "permissive", for: "select", to: ["public"] }),
    check("tasks_priority_check", sql`priority = ANY (ARRAY['p0'::text, 'p1'::text, 'p2'::text])`),
    check(
      "tasks_size_check",
      sql`size = ANY (ARRAY['xs'::text, 's'::text, 'm'::text, 'l'::text, 'xl'::text])`
    ),
  ]
)
