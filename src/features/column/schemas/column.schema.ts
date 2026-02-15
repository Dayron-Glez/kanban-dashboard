import * as z from "zod";

export const columnValidationSchema = z.object({
  title: z
    .string()
    .min(5, "El nombre de la columna debe de tener 5 caracteres como mínimo.")
    .refine(
      (value) => value.trim().length > 0,
      "El nombre de la columna no puede contener solo espacios.",
    ),
});
