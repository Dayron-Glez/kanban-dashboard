import {
  useState,
  useMemo,
  useRef,
  type ReactNode,
} from "react"
import { v4 as uuidv4 } from "uuid"
import type { ColumnType, Task, TaskPriority, TaskSize } from "../types/board.types"
import { KanbanContext } from "./kanbanCtx"

export function KanbanProvider({ children }: { children: ReactNode }) {
  const [columns, setColumns] = useState<ColumnType[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [columnCounter, setColumnCounter] = useState<number>(0)

  const scrollContainerRef = useRef<HTMLElement | null>(null)

  const columnsId = useMemo(() => columns.map((column) => column.id), [columns])

  const createNewColumn = (title?: string): void => {
    const newColumn: ColumnType = {
      id: uuidv4(),
      title: title && title.trim() !== "" ? title.trim() : `Columna ${columnCounter + 1}`,
      project_id: "",
      position: columns.length,
    }
    setColumns((prev) => [...prev, newColumn])
    setColumnCounter((prev) => prev + 1)

    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          left: scrollContainerRef.current.scrollWidth,
          behavior: "smooth",
        })
      }
    }, 50)
  }

  const updateColumn = (id: string, title: string): void => {
    setColumns((prev) => prev.map((col) => (col.id === id ? { ...col, title } : col)))
  }

  const deleteColumn = (id: string): void => {
    setColumns((prev) => prev.filter((column) => column.id !== id))
    setTasks((prev) => prev.filter((task) => task.columnId !== id))
  }

  const createNewTask = (
    columnId: string,
    taskData: { content: string; priority: TaskPriority; size: TaskSize },
  ): void => {
    const newTask: Task = {
      id: uuidv4(),
      columnId,
      content: taskData.content,
      priority: taskData.priority,
      size: taskData.size,
      project_id: "",
      position: tasks.filter((t) => t.columnId === columnId).length,
    }
    setTasks((prev) => [...prev, newTask])
  }

  const updateTask = (
    id: string,
    taskData: { content: string; priority: TaskPriority; size: TaskSize },
  ): void => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? { ...task, content: taskData.content, priority: taskData.priority, size: taskData.size }
          : task,
      ),
    )
  }

  const deleteTask = (id: string): void => {
    setTasks((prev) => prev.filter((task) => task.id !== id))
  }

  return (
    <KanbanContext.Provider
      value={{
        columns,
        tasks,
        columnsId,
        createNewColumn,
        updateColumn,
        deleteColumn,
        createNewTask,
        updateTask,
        deleteTask,
        setColumns,
        setTasks,
        scrollContainerRef,
      }}
    >
      {children}
    </KanbanContext.Provider>
  )
}
