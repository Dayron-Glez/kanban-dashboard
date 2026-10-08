import { users as usersInIdentity } from "../identity.js"
import { relations } from "drizzle-orm/relations"
import {
  projects,
  projectMembers,
  profiles,
  columns,
  projectInvitations,
  taskHistory,
  tasks,
} from "./schema.js"

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  profile: one(profiles, {
    fields: [projectMembers.userId],
    references: [profiles.id],
  }),
}))

export const projectsRelations = relations(projects, ({ one, many }) => ({
  projectMembers: many(projectMembers),
  columns: many(columns),
  projectInvitations: many(projectInvitations),
  usersInIdentity: one(usersInIdentity, {
    fields: [projects.ownerId],
    references: [usersInIdentity.id],
  }),
  tasks: many(tasks),
}))

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  projectMembers: many(projectMembers),
  usersInIdentity: one(usersInIdentity, {
    fields: [profiles.id],
    references: [usersInIdentity.id],
  }),
}))

export const columnsRelations = relations(columns, ({ one, many }) => ({
  project: one(projects, {
    fields: [columns.projectId],
    references: [projects.id],
  }),
  taskHistories_fromColumnId: many(taskHistory, {
    relationName: "taskHistory_fromColumnId_columns_id",
  }),
  taskHistories_toColumnId: many(taskHistory, {
    relationName: "taskHistory_toColumnId_columns_id",
  }),
  tasks: many(tasks),
}))

export const usersInIdentityRelations = relations(usersInIdentity, ({ many }) => ({
  profiles: many(profiles),
  projects: many(projects),
  tasks: many(tasks),
}))

export const projectInvitationsRelations = relations(projectInvitations, ({ one }) => ({
  project: one(projects, {
    fields: [projectInvitations.projectId],
    references: [projects.id],
  }),
}))

export const taskHistoryRelations = relations(taskHistory, ({ one }) => ({
  column_fromColumnId: one(columns, {
    fields: [taskHistory.fromColumnId],
    references: [columns.id],
    relationName: "taskHistory_fromColumnId_columns_id",
  }),
  column_toColumnId: one(columns, {
    fields: [taskHistory.toColumnId],
    references: [columns.id],
    relationName: "taskHistory_toColumnId_columns_id",
  }),
  task: one(tasks, {
    fields: [taskHistory.taskId],
    references: [tasks.id],
  }),
}))

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  taskHistories: many(taskHistory),
  column: one(columns, {
    fields: [tasks.columnId],
    references: [columns.id],
  }),
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  usersInIdentity: one(usersInIdentity, {
    fields: [tasks.assigneeId],
    references: [usersInIdentity.id],
  }),
}))
