import { Card, CardContent, CardHeader, CardTitle, Skeleton } from "@/shared"
import type { AnalyticsStats } from "../hooks/useAnalytics"

interface StatsCardsProps {
  stats: AnalyticsStats
  loading: boolean
}

const cards = (stats: AnalyticsStats) => [
  { title: "Total de tareas", value: stats.totalTasks, suffix: "tareas" },
  { title: "Tareas completadas", value: stats.doneTasks, suffix: "en Done" },
  { title: "Progreso", value: stats.progressPercent, suffix: "%" },
  { title: "Movimientos", value: stats.totalMoved, suffix: "en historial" },
]

export function StatsCards({ stats, loading }: StatsCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards(stats).map(({ title, value, suffix }) => (
        <Card key={title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-primary text-3xl font-bold">{value}</p>
            <p className="text-muted-foreground mt-1 text-xs">{suffix}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
