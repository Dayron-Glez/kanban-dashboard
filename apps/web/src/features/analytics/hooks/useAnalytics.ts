import { useMemo } from "react"
import { computeAnalytics, type Analytics } from "@repo/domain"
import { useColumns, useTasks } from "@/features/board/index"
import { useTaskHistory } from "../api/history"

export type {
  ActivityItem,
  AnalyticsStats,
  PriorityDataPoint,
  VelocityDataPoint,
} from "@repo/domain"

export interface UseAnalyticsReturn extends Analytics {
  loading: boolean
}

export const useAnalytics = (projectId: string): UseAnalyticsReturn => {
  const columns = useColumns(projectId)
  const tasks = useTasks(projectId)
  const history = useTaskHistory(projectId)

  const analytics = useMemo(
    () => computeAnalytics(columns.data ?? [], tasks.data ?? [], history.data ?? []),
    [columns.data, tasks.data, history.data]
  )

  return { ...analytics, loading: columns.isPending || tasks.isPending || history.isPending }
}
