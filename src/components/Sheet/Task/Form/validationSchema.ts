import * as z from "zod";

export const validationSchema = z.object({
  content: z
    .string()
    .min(5, "El contenido de la tarea debe de tener 5 caracteres como mínimo."),
});
