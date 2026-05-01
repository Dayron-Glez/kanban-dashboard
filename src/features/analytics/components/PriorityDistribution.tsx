import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from "@/shared"
import type { PriorityDataPoint } from "../hooks/useAnalytics"

interface PriorityDistributionProps {
  data: PriorityDataPoint[]
  loading: boolean
}

const PRIORITY_COLORS = ["#ef4444", "#f59e0b", "#6b7280"]

export function PriorityDistribution({ data, loading }: PriorityDistributionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Distribución por prioridad</CardTitle>
        <p className="text-sm text-muted-foreground">Tareas activas agrupadas por nivel de prioridad</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-44 w-full rounded-lg" />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="prioridad" tick={{ fontSize: 13 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ fontSize: 13 }}
                formatter={(value) => [value, "Tareas"]}
              />
              <Bar dataKey="tareas" radius={[4, 4, 0, 0]}>
                {data.map((_, i) => (
                  <Cell key={i} fill={PRIORITY_COLORS[i % PRIORITY_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
