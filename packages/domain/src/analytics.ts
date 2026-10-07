import { formatDistance, getISOWeek, getISOWeekYear, subWeeks } from "date-fns"
import { es } from "date-fns/locale"
import type { Column, Task, TaskHistoryEntry, TaskPriority } from "@repo/contracts"
import { doneColumnId } from "./columnCategory.js"

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

export interface Analytics {
  /** false si el proyecto no tiene columna terminada: el progreso no se puede medir. */
  hasDoneColumn: boolean
  stats: AnalyticsStats
  velocityData: VelocityDataPoint[]
  priorityData: PriorityDataPoint[]
  activityItems: ActivityItem[]
}

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  p0: "Urgente",
  p1: "Normal",
  p2: "Baja",
}

const weekKey = (date: Date) =>
  `${getISOWeekYear(date)}-${String(getISOWeek(date)).padStart(2, "0")}`

const buildVelocityData = (
  history: TaskHistoryEntry[],
  doneId: string | undefined,
  now: Date
): VelocityDataPoint[] => {
  const last8Weeks = Array.from({ length: 8 }, (_, i) => {
    const date = subWeeks(now, 7 - i)
    return { key: weekKey(date), label: `Sem ${getISOWeek(date)}` }
  })

  const countByWeek: Record<string, number> = {}
  for (const entry of history) {
    if (!doneId || entry.toColumnId !== doneId) continue
    const key = weekKey(new Date(entry.movedAt))
    countByWeek[key] = (countByWeek[key] ?? 0) + 1
  }

  return last8Weeks.map(({ key, label }) => ({ week: label, tareas: countByWeek[key] ?? 0 }))
}

const buildActivityItems = (
  history: TaskHistoryEntry[],
  columns: Column[],
  now: Date
): ActivityItem[] => {
  const titles = new Map(columns.map((column) => [column.id, column.title]))
  return history.slice(0, 15).map((entry) => ({
    id: entry.id,
    taskContent: entry.taskContent,
    fromColumnTitle: entry.fromColumnId
      ? (titles.get(entry.fromColumnId) ?? "Columna eliminada")
      : null,
    toColumnTitle: titles.get(entry.toColumnId) ?? "Columna eliminada",
    movedAt: entry.movedAt,
    movedAtRelative: formatDistance(new Date(entry.movedAt), now, { addSuffix: true, locale: es }),
  }))
}

export function computeAnalytics(
  columns: Column[],
  tasks: Task[],
  history: TaskHistoryEntry[],
  now: Date = new Date()
): Analytics {
  const doneId = doneColumnId(columns)
  const doneTasks = doneId ? tasks.filter((task) => task.columnId === doneId).length : 0
  const totalTasks = tasks.length

  return {
    hasDoneColumn: doneId !== undefined,
    stats: {
      totalTasks,
      doneTasks,
      progressPercent: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
      totalMoved: history.length,
    },
    velocityData: buildVelocityData(history, doneId, now),
    priorityData: (Object.keys(PRIORITY_LABELS) as TaskPriority[]).map((priority) => ({
      prioridad: PRIORITY_LABELS[priority],
      tareas: tasks.filter((task) => task.priority === priority).length,
    })),
    activityItems: buildActivityItems(history, columns, now),
  }
}
