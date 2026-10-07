import * as z from "zod"
import { TaskPrioritySchema, TaskSizeSchema } from "./enums"

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
