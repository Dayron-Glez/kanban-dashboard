import * as z from "zod"
import { TaskPrioritySchema, TaskSizeSchema } from "./enums.js"

export const TaskSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  columnId: z.uuid(),
  content: z.string(),
  priority: TaskPrioritySchema,
  size: TaskSizeSchema,
  dueDate: z.iso.date().nullable(),
  position: z.number().int().nonnegative(),
  assigneeId: z.uuid().nullable(),
})
export type Task = z.infer<typeof TaskSchema>

export const TaskInputSchema = TaskSchema.pick({
  content: true,
  priority: true,
  size: true,
  dueDate: true,
  assigneeId: true,
})
export type TaskInput = z.infer<typeof TaskInputSchema>

export const CreateTaskInputSchema = TaskInputSchema.extend({
  projectId: z.uuid(),
  columnId: z.uuid(),
})
export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>

/** El orden final de la columna de destino, con la tarea movida incluida. */
export const MoveTaskInputSchema = z.object({
  taskId: z.uuid(),
  toColumnId: z.uuid(),
  orderedTaskIds: z.array(z.uuid()),
})
export type MoveTaskInput = z.infer<typeof MoveTaskInputSchema>

/** Tarea asignada al usuario, con el contexto de dónde vive: la vista transversal del inicio. */
export const AssignedTaskSchema = TaskSchema.pick({
  id: true,
  projectId: true,
  content: true,
  priority: true,
  size: true,
}).extend({
  projectName: z.string(),
  projectColor: z.string(),
  columnTitle: z.string(),
})
export type AssignedTask = z.infer<typeof AssignedTaskSchema>

export const TaskHistoryEntrySchema = z.object({
  id: z.uuid(),
  taskId: z.uuid(),
  taskContent: z.string(),
  fromColumnId: z.uuid().nullable(),
  toColumnId: z.uuid(),
  movedAt: z.iso.datetime({ offset: true }),
})
export type TaskHistoryEntry = z.infer<typeof TaskHistoryEntrySchema>
