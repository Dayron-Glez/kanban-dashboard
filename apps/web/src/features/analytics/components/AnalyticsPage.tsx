import { useParams } from "react-router"
import { motion } from "framer-motion"
import { IconInfoCircle } from "@tabler/icons-react"
import { useAnalytics } from "../hooks/useAnalytics"
import { StatsCards } from "./StatsCards"
import { VelocityChart } from "./VelocityChart"
import { PriorityDistribution } from "./PriorityDistribution"
import { ActivityFeed } from "./ActivityFeed"

export function AnalyticsPage() {
  const { id: projectId = "" } = useParams<{ id: string }>()
  const { velocityData, priorityData, activityItems, stats, hasDoneColumn, loading } =
    useAnalytics(projectId)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6"
    >
      {!loading && !hasDoneColumn && (
        <div
          role="status"
          className="border-border bg-card text-muted-foreground flex items-center gap-2 rounded-xl border px-4 py-3 text-sm"
        >
          <IconInfoCircle size={16} className="shrink-0" />
          Marca una columna como «Hecha» desde su cabecera para medir el progreso y la velocidad.
        </div>
      )}

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
