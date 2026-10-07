import type { TaskInput } from "@repo/contracts"
import type { TaskWithAssignee } from "@repo/domain"

/** Tarea tal como la pinta el tablero: con el perfil de quien la tiene asignada. */
export type BoardTask = TaskWithAssignee

/** Lo que llega de los formularios de crear y editar tarea. */
export type TaskDraft = Pick<TaskInput, "content" | "priority" | "size"> &
  Partial<Pick<TaskInput, "dueDate" | "assigneeId">>
