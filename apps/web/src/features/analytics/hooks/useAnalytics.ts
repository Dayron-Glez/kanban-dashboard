import { useMemo } from "react"
import { getISOWeek, getISOWeekYear, subWeeks, formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import type { Column, Task, TaskHistoryEntry } from "@repo/contracts"
import { useColumns, useTasks } from "@/features/board/index"
import { useTaskHistory } from "../api/history"

export interface VelocityDataPoint {
  week: string
  tareas: number
}

export interface PriorityDataPoint {
  prioridad: string
  tareas: number
}

export interface ActivityItem {
  id: string
  taskContent: string
  fromColumnTitle: string | null
  toColumnTitle: string
  movedAt: string
  movedAtRelative: string
}

export interface AnalyticsStats {
  totalTasks: number
  doneTasks: number
  progressPercent: number
  totalMoved: number
}

export interface UseAnalyticsReturn {
  velocityData: VelocityDataPoint[]
  priorityData: PriorityDataPoint[]
  activityItems: ActivityItem[]
  stats: AnalyticsStats
  loading: boolean
}

const PRIORITY_LABELS: Record<string, string> = {
  p0: "Urgente",
  p1: "Normal",
  p2: "Baja",
}

const weekKey = (date: Date) =>
  `${getISOWeekYear(date)}-${String(getISOWeek(date)).padStart(2, "0")}`

const buildVelocityData = (
  history: TaskHistoryEntry[],
  doneColumnId: string | undefined
): VelocityDataPoint[] => {
  const now = new Date()
  const last8Weeks = Array.from({ length: 8 }, (_, i) => {
    const date = subWeeks(now, 7 - i)
    return { key: weekKey(date), label: `Sem ${getISOWeek(date)}` }
  })

  if (!doneColumnId) return last8Weeks.map(({ label }) => ({ week: label, tareas: 0 }))

  const countByWeek: Record<string, number> = {}
  for (const entry of history) {
    if (entry.toColumnId !== doneColumnId) continue
    const key = weekKey(new Date(entry.movedAt))
    countByWeek[key] = (countByWeek[key] ?? 0) + 1
  }

  return last8Weeks.map(({ key, label }) => ({ week: label, tareas: countByWeek[key] ?? 0 }))
}

const buildPriorityData = (tasks: Task[]): PriorityDataPoint[] =>
  ["p0", "p1", "p2"].map((p) => ({
    prioridad: PRIORITY_LABELS[p],
    tareas: tasks.filter((t) => t.priority === p).length,
  }))

const buildActivityItems = (history: TaskHistoryEntry[], columns: Column[]): ActivityItem[] => {
  const titles = new Map(columns.map((c) => [c.id, c.title]))
  return history.slice(0, 15).map((entry) => ({
    id: entry.id,
    taskContent: entry.taskContent,
    fromColumnTitle: entry.fromColumnId
      ? (titles.get(entry.fromColumnId) ?? "Columna eliminada")
      : null,
    toColumnTitle: titles.get(entry.toColumnId) ?? "Columna eliminada",
    movedAt: entry.movedAt,
    movedAtRelative: formatDistanceToNow(new Date(entry.movedAt), { addSuffix: true, locale: es }),
  }))
}

export const useAnalytics = (projectId: string): UseAnalyticsReturn => {
  const columnsQuery = useColumns(projectId)
  const tasksQuery = useTasks(projectId)
  const historyQuery = useTaskHistory(projectId)

  const loading = columnsQuery.isPending || tasksQuery.isPending || historyQuery.isPending

  const derived = useMemo(() => {
    const columns = columnsQuery.data ?? []
    const tasks = tasksQuery.data ?? []
    const history = historyQuery.data ?? []

    // Bug conocido, anterior a este cambio: la columna terminal se detecta por
    // el texto «done». Se corrige en el PR 2 con la categoría de estado.
    const doneColumnId = columns.find((c) => c.title.toLowerCase().includes("done"))?.id
    const doneTasks = doneColumnId ? tasks.filter((t) => t.columnId === doneColumnId).length : 0
    const totalTasks = tasks.length

    return {
      stats: {
        totalTasks,
        doneTasks,
        progressPercent: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
        totalMoved: history.length,
      },
      velocityData: buildVelocityData(history, doneColumnId),
      priorityData: buildPriorityData(tasks),
      activityItems: buildActivityItems(history, columns),
    }
  }, [columnsQuery.data, tasksQuery.data, historyQuery.data])

  return { ...derived, loading }
}
