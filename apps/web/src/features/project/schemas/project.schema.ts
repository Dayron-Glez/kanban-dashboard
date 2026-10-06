import * as z from "zod"

export const PROJECT_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#06b6d4",
  "#6366f1",
] as const

export const projectSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres"),
  description: z.string().trim().optional(),
  color: z.string().min(1),
})

export type ProjectFormValues = z.infer<typeof projectSchema>
