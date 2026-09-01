import { useMemo } from "react"
import { Separator } from "@/shared"
import { useProjectsContext } from "../context/projectsCtx"

const PRIORITY_BARS = [
  { key: "p0", label: "P0", barClass: "bg-p0" },
  { key: "p1", label: "P1", barClass: "bg-p1" },
  { key: "p2", label: "P2", barClass: "bg-p2" },
] as const

function MetricRow({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <div className="min-w-0">
        <p className="text-foreground text-[12.5px] font-semibold">{label}</p>
        {sub && <p className="text-muted-foreground text-[10.5px]">{sub}</p>}
      </div>
      <span className="text-foreground text-sm font-bold tabular-nums">{value}</span>
    </div>
  )
}

/**
 * Panel de resumen de /projects, al estilo del panel de uso de Supabase:
 * métricas agregadas y distribución de prioridades. Todo se deriva del
 * contexto ya cargado — cero consultas propias.
 */
export function ProjectsSummaryPanel() {
  const { projects, taskCounts, priorityCounts, favoriteIds, userRoles } = useProjectsContext()

  const stats = useMemo(() => {
    const owned = projects.filter((p) => userRoles[p.id] === "owner").length
    const shared = projects.length - owned
    const totalTasks = projects.reduce((sum, p) => sum + (taskCounts[p.id] ?? 0), 0)
    const favorites = projects.filter((p) => favoriteIds[p.id]).length
    const priorities = { p0: 0, p1: 0, p2: 0 }
    for (const p of projects) {
      const counts = priorityCounts[p.id]
      if (!counts) continue
      priorities.p0 += counts.p0
      priorities.p1 += counts.p1
      priorities.p2 += counts.p2
    }
    return { owned, shared, totalTasks, favorites, priorities }
  }, [projects, taskCounts, priorityCounts, favoriteIds, userRoles])

  const ownedSub = [
    `${stats.owned} ${stats.owned === 1 ? "propio" : "propios"}`,
    stats.shared > 0 && `${stats.shared} ${stats.shared === 1 ? "compartido" : "compartidos"}`,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <div className="bg-card border-border flex flex-col gap-4 rounded-xl border p-4 shadow-sm">
      <span className="text-muted-foreground text-[10.5px] font-bold tracking-[0.07em] uppercase">
        Resumen
      </span>

      <div className="flex flex-col gap-3">
        <MetricRow label="Proyectos" value={projects.length} sub={ownedSub} />
        <MetricRow label="Tareas totales" value={stats.totalTasks} />
        <MetricRow label="Favoritos" value={stats.favorites} />
      </div>

      {stats.totalTasks > 0 && (
        <>
          <Separator />
          <div className="flex flex-col gap-2.5">
            <span className="text-muted-foreground text-[10.5px] font-bold tracking-[0.07em] uppercase">
              Prioridades
            </span>
            {PRIORITY_BARS.map(({ key, label, barClass }) => {
              const count = stats.priorities[key]
              const percent = Math.round((count / stats.totalTasks) * 100)
              return (
                <div key={key} className="flex items-center gap-2.5">
                  <span className="text-muted-foreground w-5 shrink-0 text-[11px] font-bold">
                    {label}
                  </span>
                  <div
                    role="progressbar"
                    aria-label={`Tareas ${label}`}
                    aria-valuenow={count}
                    aria-valuemin={0}
                    aria-valuemax={stats.totalTasks}
                    className="bg-muted h-1.5 min-w-0 flex-1 overflow-hidden rounded-full"
                  >
                    <div
                      className={`h-full rounded-full ${barClass}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="text-foreground w-6 shrink-0 text-right text-[11px] font-bold tabular-nums">
                    {count}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
