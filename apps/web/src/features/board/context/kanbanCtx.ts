import { createContext } from "react"
import type { RefObject } from "react"
import type { Column, MemberRole, ProjectMember, Task } from "@repo/contracts"
import type { BoardTask, TaskDraft } from "../types/board.types"

export interface KanbanContextType {
  columns: Column[]
  tasks: BoardTask[]
  columnsId: string[]
  loading: boolean
  userRole: MemberRole | null
  members: ProjectMember[]
  createNewColumn: (title?: string) => void
  updateColumn: (id: string, title: string) => void
  deleteColumn: (id: string) => void
  createNewTask: (columnId: string, draft: TaskDraft) => void
  updateTask: (id: string, draft: TaskDraft) => void
  deleteTask: (id: string) => void
  setColumns: React.Dispatch<React.SetStateAction<Column[]>>
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>
  scrollContainerRef: RefObject<HTMLElement | null>
}

export const KanbanContext = createContext<KanbanContextType | null>(null)
