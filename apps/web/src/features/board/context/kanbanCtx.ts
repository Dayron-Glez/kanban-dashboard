import { createContext } from "react"
import type { RefObject } from "react"
import type { ColumnType, Task, TaskPriority, TaskSize } from "../types/board.types"
import type { MemberRole, ProjectMember } from "@/shared/supabase"

export interface KanbanContextType {
  columns: ColumnType[]
  tasks: Task[]
  columnsId: string[]
  loading: boolean
  userRole: MemberRole | null
  members: ProjectMember[]
  createNewColumn: (title?: string) => void
  updateColumn: (id: string, title: string) => void
  deleteColumn: (id: string) => void
  createNewTask: (
    columnId: string,
    taskData: {
      content: string
      priority: TaskPriority
      size: TaskSize
      assignee_id?: string | null
    }
  ) => void
  updateTask: (
    id: string,
    taskData: {
      content: string
      priority: TaskPriority
      size: TaskSize
      assignee_id?: string | null
    }
  ) => void
  deleteTask: (id: string) => void
  setColumns: React.Dispatch<React.SetStateAction<ColumnType[]>>
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>
  scrollContainerRef: RefObject<HTMLElement | null>
}

export const KanbanContext = createContext<KanbanContextType | null>(null)
