import type { TaskPriority, TaskSize } from "@/features/board/types/board.types"

export const PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; className: string; borderClassName: string; bgClassName: string }
> = {
  p0: {
    label: "P0",
    className: "bg-red-100 text-red-600",
    borderClassName: "border-red-200 border-l-red-400 dark:border-red-900 dark:border-l-red-600",
    bgClassName: "bg-red-50/60 dark:bg-red-950/40",
  },
  p1: {
    label: "P1",
    className: "bg-orange-100 text-orange-600",
    borderClassName: "border-orange-200 border-l-orange-400 dark:border-orange-900 dark:border-l-orange-600",
    bgClassName: "bg-orange-50/60 dark:bg-orange-950/40",
  },
  p2: {
    label: "P2",
    className: "bg-blue-100 text-blue-600",
    borderClassName: "border-blue-200 border-l-blue-400 dark:border-blue-900 dark:border-l-blue-600",
    bgClassName: "bg-blue-50/50 dark:bg-blue-950/40",
  },
}

export const SIZE_CONFIG: Record<TaskSize, { label: string; className: string }> = {
  xs: { label: "XS", className: "bg-green-50 text-green-600" },
  s:  { label: "S",  className: "bg-emerald-50 text-emerald-600" },
  m:  { label: "M",  className: "bg-blue-50 text-blue-500" },
  l:  { label: "L",  className: "bg-violet-50 text-violet-600" },
  xl: { label: "XL", className: "bg-orange-50 text-orange-500" },
}
