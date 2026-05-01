import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from "@/shared"
import type { VelocityDataPoint } from "../hooks/useAnalytics"

interface VelocityChartProps {
  data: VelocityDataPoint[]
  loading: boolean
}

export function VelocityChart({ data, loading }: VelocityChartProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-base">Velocidad semanal</CardTitle>
        <p className="text-sm text-muted-foreground">Tareas completadas por semana (últimas 8)</p>
      </CardHeader>
      <CardContent className="flex-1">
        {loading ? (
          <Skeleton className="h-52 w-full rounded-lg" />
        ) : (
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <Tooltip
                contentStyle={{ fontSize: 13 }}
                formatter={(value) => [value, "Tareas"]}
              />
              <Bar dataKey="tareas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
