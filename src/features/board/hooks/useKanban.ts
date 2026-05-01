import { useContext } from "react"
import { KanbanContext } from "../context/kanbanCtx"
import type { KanbanContextType } from "../context/kanbanCtx"

export function useKanban(): KanbanContextType {
  const context = useContext(KanbanContext)
  if (!context) throw new Error("useKanban debe usarse dentro de KanbanProvider")
  return context
}
