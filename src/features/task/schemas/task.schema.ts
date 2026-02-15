import * as z from "zod";
import { TASK_PRIORITIES, TASK_SIZES } from "@/features/board/index";

export const taskValidationSchema = z.object({
  content: z
    .string()
    .trim()
    .min(5, "El contenido debe tener al menos 5 caracteres."),
  priority: z.enum(TASK_PRIORITIES, {
    message: "Selecciona una prioridad válida",
  }),
  size: z.enum(TASK_SIZES, {
    message: "Selecciona un tamaño válido",
  }),
});
