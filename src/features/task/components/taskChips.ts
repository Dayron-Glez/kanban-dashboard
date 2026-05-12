import type { TaskPriority, TaskSize } from "@/features/board/types/board.types"

interface PriorityChipCfg {
  label: string
  className: string
  borderClassName: string
  bgClassName: string
}

export const PRIORITY_CONFIG: Record<TaskPriority, PriorityChipCfg> = {
  p0: {
    label: "P0",
    className: "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400",
    borderClassName: "border-red-200 border-l-red-500 dark:border-red-900 dark:border-l-red-400",
    bgClassName: "bg-red-50/40 dark:bg-red-500/5",
  },
  p1: {
    label: "P1",
    className: "bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400",
    borderClassName:
      "border-orange-200 border-l-orange-500 dark:border-orange-900 dark:border-l-orange-400",
    bgClassName: "bg-orange-50/40 dark:bg-orange-500/5",
  },
  p2: {
    label: "P2",
    className: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
    borderClassName:
      "border-blue-200 border-l-blue-500 dark:border-blue-900 dark:border-l-blue-400",
    bgClassName: "bg-blue-50/40 dark:bg-blue-500/5",
  },
}

interface SizeChipCfg {
  label: string
  className: string
}

export const SIZE_CONFIG: Record<TaskSize, SizeChipCfg> = {
  xs: {
    label: "XS",
    className: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  },
  s: { label: "S", className: "bg-teal-50 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400" },
  m: { label: "M", className: "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400" },
  l: {
    label: "L",
    className: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400",
  },
  xl: {
    label: "XL",
    className: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  },
}

export const priorityOrder: Record<TaskPriority, number> = { p0: 0, p1: 1, p2: 2 }

export function sortByPriority<T extends { priority: TaskPriority }>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
}
