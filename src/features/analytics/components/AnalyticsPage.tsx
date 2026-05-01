import { useParams } from "react-router"
import { useKanban } from "@/features/board/index"
import { useAnalytics } from "../hooks/useAnalytics"
import { StatsCards } from "./StatsCards"
import { VelocityChart } from "./VelocityChart"
import { PriorityDistribution } from "./PriorityDistribution"
import { ActivityFeed } from "./ActivityFeed"

export function AnalyticsPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const { columns, tasks } = useKanban()
  const { velocityData, priorityData, activityItems, stats, loading } = useAnalytics(
    projectId,
    columns,
    tasks,
  )

  return (
    <div className="p-6 flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <StatsCards stats={stats} loading={loading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <VelocityChart data={velocityData} loading={loading} />
        </div>
        <div className="lg:col-span-1">
          <ActivityFeed items={activityItems} loading={loading} />
        </div>
      </div>

      <PriorityDistribution data={priorityData} loading={loading} />
    </div>
  )
}
