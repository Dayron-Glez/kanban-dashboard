import * as z from "zod"
import { TASK_PRIORITIES, TASK_SIZES } from "@repo/contracts"

export const taskValidationSchema = z.object({
  content: z.string().trim().min(5, "El contenido debe tener al menos 5 caracteres."),
  priority: z.enum(TASK_PRIORITIES, {
    message: "Selecciona una prioridad válida",
  }),
  size: z.enum(TASK_SIZES, {
    message: "Selecciona un tamaño válido",
  }),
  assigneeId: z.string().nullable().optional(),
  // ISO yyyy-MM-dd, que es lo que guarda una columna date de Postgres.
  dueDate: z.string().nullable().optional(),
})

export type TaskFormValues = z.infer<typeof taskValidationSchema>
