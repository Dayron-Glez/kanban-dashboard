import { useParams } from "react-router"
import { motion } from "framer-motion"
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
    tasks
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.14 }}
      className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6"
    >
      <StatsCards stats={stats} loading={loading} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <VelocityChart data={velocityData} loading={loading} />
        </div>
        <div className="lg:col-span-1">
          <ActivityFeed items={activityItems} loading={loading} />
        </div>
      </div>

      <PriorityDistribution data={priorityData} loading={loading} />
    </motion.div>
  )
}
