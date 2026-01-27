import * as z from "zod";

export const validationSchema = z.object({
  content: z
    .string()
    .min(5, "El contenido de la tarea debe de tener 5 caracteres como mínimo.")
    .refine(
      (value) => value.trim().length > 0,
      "El contenido de la tarea no puede contener solo espacios.",
    ),
});
