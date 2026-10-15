import { sql } from "drizzle-orm"
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgSchema,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core"
import { users } from "./identity.js"

export const core = pgSchema("core")

const createdAt = timestamp("created_at", { withTimezone: true, mode: "string" })
  .defaultNow()
  .notNull()

export const projects = core.table(
  "projects",
  {
    id: uuid().defaultRandom().primaryKey(),
    ownerId: uuid("owner_id").notNull(),
    kind: text().default("film").notNull(),
    name: text().notNull(),
    description: text(),
    color: text().default("#3b82f6").notNull(),
    createdAt,
  },
  (table) => [
    foreignKey({
      columns: [table.ownerId],
      foreignColumns: [users.id],
      name: "projects_owner_id_fkey",
    }).onDelete("cascade"),
    check("projects_kind_check", sql`${table.kind} in ('film', 'series', 'documentary')`),
  ]
)

export const projectMembers = core.table(
  "project_members",
  {
    id: uuid().defaultRandom().primaryKey(),
    projectId: uuid("project_id").notNull(),
    userId: uuid("user_id").notNull(),
    role: text().default("member").notNull(),
    isFavorite: boolean("is_favorite").default(false).notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: "project_members_project_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "project_members_user_id_fkey",
    }).onDelete("cascade"),
    unique("project_members_project_id_user_id_key").on(table.projectId, table.userId),
    check("project_members_role_check", sql`${table.role} in ('owner', 'member')`),
  ]
)

export const projectInvitations = core.table(
  "project_invitations",
  {
    id: uuid().defaultRandom().primaryKey(),
    projectId: uuid("project_id").notNull(),
    email: text().notNull(),
    token: uuid().defaultRandom().notNull(),
    status: text().default("pending").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" })
      .default(sql`now() + interval '7 days'`)
      .notNull(),
    createdAt,
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: "project_invitations_project_id_fkey",
    }).onDelete("cascade"),
    unique("project_invitations_token_key").on(table.token),
    check("project_invitations_status_check", sql`${table.status} in ('pending', 'accepted')`),
  ]
)

export const departments = core.table(
  "departments",
  {
    id: uuid()
      .default(sql`uuidv7()`)
      .primaryKey(),
    projectId: uuid("project_id").notNull(),
    name: text().notNull(),
    position: integer().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: "departments_project_id_fkey",
    }).onDelete("cascade"),
    unique("departments_project_id_name_key").on(table.projectId, table.name),
    check("departments_position_check", sql`${table.position} >= 0`),
  ]
)

export const crewMembers = core.table(
  "crew_members",
  {
    id: uuid()
      .default(sql`uuidv7()`)
      .primaryKey(),
    projectId: uuid("project_id").notNull(),
    fullName: text("full_name").notNull(),
    email: text(),
    departmentId: uuid("department_id"),
    createdAt,
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: "crew_members_project_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.departmentId],
      foreignColumns: [departments.id],
      name: "crew_members_department_id_fkey",
    }).onDelete("set null"),
    index("crew_members_project_id_idx").on(table.projectId),
  ]
)
