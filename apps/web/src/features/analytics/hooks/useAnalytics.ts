import { useEffect, useState } from "react"
import { getISOWeek, getISOWeekYear, subWeeks, formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { supabase } from "@/shared/supabase"
import type { ColumnType, Task } from "@/features/board/index"

interface TaskHistoryRecord {
  id: string
  task_id: string
  from_column_id: string | null
  to_column_id: string
  moved_at: string
  tasks: { id: string; content: string; project_id: string } | null
}

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

const buildVelocityData = (
  history: TaskHistoryRecord[],
  doneColumnId: string | undefined
): VelocityDataPoint[] => {
  const now = new Date()
  const last8Weeks = Array.from({ length: 8 }, (_, i) => {
    const d = subWeeks(now, 7 - i)
    const week = getISOWeek(d)
    const year = getISOWeekYear(d)
    return {
      key: `${year}-${String(week).padStart(2, "0")}`,
      label: `Sem ${week}`,
    }
  })

  if (!doneColumnId) return last8Weeks.map(({ label }) => ({ week: label, tareas: 0 }))

  const countByWeek: Record<string, number> = {}
  history
    .filter((h) => h.to_column_id === doneColumnId)
    .forEach((h) => {
      const d = new Date(h.moved_at)
      const key = `${getISOWeekYear(d)}-${String(getISOWeek(d)).padStart(2, "0")}`
      countByWeek[key] = (countByWeek[key] ?? 0) + 1
    })

  return last8Weeks.map(({ key, label }) => ({ week: label, tareas: countByWeek[key] ?? 0 }))
}

const buildPriorityData = (tasks: Task[]): PriorityDataPoint[] =>
  ["p0", "p1", "p2"].map((p) => ({
    prioridad: PRIORITY_LABELS[p],
    tareas: tasks.filter((t) => t.priority === p).length,
  }))

const buildActivityItems = (
  history: TaskHistoryRecord[],
  columns: ColumnType[]
): ActivityItem[] => {
  const colMap = new Map(columns.map((c) => [c.id, c.title]))
  return history.slice(0, 15).map((h) => ({
    id: h.id,
    taskContent: h.tasks?.content ?? "Tarea eliminada",
    fromColumnTitle: h.from_column_id
      ? (colMap.get(h.from_column_id) ?? "Columna eliminada")
      : null,
    toColumnTitle: colMap.get(h.to_column_id) ?? "Columna eliminada",
    movedAt: h.moved_at,
    movedAtRelative: formatDistanceToNow(new Date(h.moved_at), { addSuffix: true, locale: es }),
  }))
}

export const useAnalytics = (
  projectId: string | undefined,
  columns: ColumnType[],
  tasks: Task[]
): UseAnalyticsReturn => {
  const [loading, setLoading] = useState(true)
  const [velocityData, setVelocityData] = useState<VelocityDataPoint[]>([])
  const [priorityData, setPriorityData] = useState<PriorityDataPoint[]>([])
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([])
  const [stats, setStats] = useState<AnalyticsStats>({
    totalTasks: 0,
    doneTasks: 0,
    progressPercent: 0,
    totalMoved: 0,
  })

  useEffect(() => {
    if (!projectId || columns.length === 0) return
    let cancelled = false

    supabase
      .from("task_history")
      .select("id, task_id, from_column_id, to_column_id, moved_at, tasks(id, content, project_id)")
      .order("moved_at", { ascending: false })
      .then(({ data }) => {
        if (cancelled) return

        const history = ((data ?? []) as TaskHistoryRecord[]).filter(
          (h) => h.tasks?.project_id === projectId
        )

        const doneColumnId = columns.find((c) => c.title.toLowerCase().includes("done"))?.id

        const doneTasks = doneColumnId ? tasks.filter((t) => t.columnId === doneColumnId).length : 0
        const totalTasks = tasks.length
        const progressPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

        setStats({ totalTasks, doneTasks, progressPercent, totalMoved: history.length })
        setVelocityData(buildVelocityData(history, doneColumnId))
        setPriorityData(buildPriorityData(tasks))
        setActivityItems(buildActivityItems(history, columns))
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [projectId, columns, tasks])

  return { velocityData, priorityData, activityItems, stats, loading }
}
