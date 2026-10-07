import { AssignedTaskSchema, TaskSchema } from "@repo/contracts"
import * as z from "zod"
import type { TasksRepository } from "../ApiClient"
import type { HttpClient } from "./httpClient"

export const createTasksRepository = (http: HttpClient): TasksRepository => ({
  listByProject: (projectId) =>
    http.request("GET", `/projects/${projectId}/tasks`, { schema: z.array(TaskSchema) }),
  listAssignedToMe: () => http.request("GET", "/me/tasks", { schema: z.array(AssignedTaskSchema) }),
  create: ({ projectId, ...body }) =>
    http.request("POST", `/projects/${projectId}/tasks`, { body, schema: TaskSchema }),
  update: (id, input) => http.request("PUT", `/tasks/${id}`, { body: input }),
  remove: (id) => http.request("DELETE", `/tasks/${id}`),
  move: ({ taskId, ...body }) => http.request("POST", `/tasks/${taskId}/move`, { body }),
})
