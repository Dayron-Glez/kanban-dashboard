import { sql } from "drizzle-orm"
import {
  boolean,
  check,
  foreignKey,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core"
import { users } from "./identity.js"

const createdAt = timestamp("created_at", { withTimezone: true, mode: "string" })
  .defaultNow()
  .notNull()

export const profiles = pgTable(
  "profiles",
  {
    id: uuid().primaryKey(),
    fullName: text("full_name"),
    avatarUrl: text("avatar_url"),
    email: text(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.id],
      foreignColumns: [users.id],
      name: "profiles_id_fkey",
    }).onDelete("cascade"),
  ]
)

export const projects = pgTable(
  "projects",
  {
    id: uuid().defaultRandom().primaryKey(),
    ownerId: uuid("owner_id").notNull(),
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
  ]
)

export const projectMembers = pgTable(
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
      foreignColumns: [profiles.id],
      name: "project_members_user_id_fkey",
    }).onDelete("cascade"),
    unique("project_members_project_id_user_id_key").on(table.projectId, table.userId),
    check("project_members_role_check", sql`${table.role} in ('owner', 'member')`),
  ]
)

export const projectInvitations = pgTable(
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
