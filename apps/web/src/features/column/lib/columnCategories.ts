import type { ColumnCategory } from "@repo/contracts"

interface CategoryConfig {
  label: string
  color: string
}

// Bloqueada en ámbar y no en rojo: el rojo ya marca las tareas urgentes en la
// misma cabecera, y los dos avisos se confundirían.
export const CATEGORY_CONFIG: Record<ColumnCategory, CategoryConfig> = {
  todo: { label: "Por hacer", color: "#6366f1" },
  doing: { label: "En curso", color: "#0ea5e9" },
  blocked: { label: "Bloqueada", color: "#f59e0b" },
  done: { label: "Hecha", color: "#10b981" },
}
