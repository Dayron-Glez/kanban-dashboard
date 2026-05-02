export const TASK_PRIORITIES = ["p0", "p1", "p2"] as const
export const TASK_SIZES = ["xs", "s", "m", "l", "xl"] as const

export type TaskPriority = (typeof TASK_PRIORITIES)[number]
export type TaskSize = (typeof TASK_SIZES)[number]

export interface Task {
  id: string
  content: string
  priority: TaskPriority
  size: TaskSize
  columnId: string
  project_id: string
  position: number
  assignee_id: string | null
  assigneeProfile: { full_name: string | null; avatar_url: string | null } | null
}

export interface ColumnType {
  id: string
  title: string
  project_id: string
  position: number
}
