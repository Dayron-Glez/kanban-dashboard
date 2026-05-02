import type { TaskPriority, TaskSize } from "@/features/board/types/board.types"

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; className: string }> = {
  p0: { label: "P0", className: "bg-red-100 text-red-600" },
  p1: { label: "P1", className: "bg-orange-100 text-orange-600" },
  p2: { label: "P2", className: "bg-blue-100 text-blue-600" },
}

export const SIZE_CONFIG: Record<TaskSize, { label: string; className: string }> = {
  xs: { label: "XS", className: "bg-green-50 text-green-600" },
  s:  { label: "S",  className: "bg-emerald-50 text-emerald-600" },
  m:  { label: "M",  className: "bg-blue-50 text-blue-500" },
  l:  { label: "L",  className: "bg-violet-50 text-violet-600" },
  xl: { label: "XL", className: "bg-orange-50 text-orange-500" },
}
