import type { ReactNode } from "react"
import { IconAlertTriangle, IconAnchor } from "@tabler/icons-react"
import { Badge, cn } from "@/shared/index"
import { formatPlanDate, type PlanSummary } from "../lib/planFormat"

interface PlanHeaderProps {
  /** El título de la pantalla: el selector de vista. */
  title: ReactNode
  summary: PlanSummary
  /** Los controles de la vista, a la derecha. */
  actions?: ReactNode
}

/**
 * Qué se está viendo: el selector de vista como título, el aviso de lo que falta
 * (solo si falta algo) y, debajo, el resumen del plan como subtítulo.
 */
export function PlanHeader({ title, summary, actions }: Readonly<PlanHeaderProps>) {
  const { anchor, span, phasesWithoutDuration } = summary

  return (
    <header className="flex flex-wrap items-start gap-x-4 gap-y-2">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          {title}
          {phasesWithoutDuration > 0 && (
            <Badge
              variant="outline"
              className="bg-warn-soft text-warn border-warn/30 h-6 px-2.5 text-sm [&>svg]:size-3.5"
            >
              <IconAlertTriangle aria-hidden />
              {phasesWithoutDuration === 1
                ? "1 fase sin duración"
                : `${phasesWithoutDuration} fases sin duración`}
            </Badge>
          )}
        </div>
        {(anchor || span) && (
          <p className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 pl-1 text-sm tabular-nums">
            {anchor && (
              <span
                title="La fecha clave del plan"
                className={cn("inline-flex items-center gap-1", !anchor.startsOn && "text-warn")}
              >
                <IconAnchor size={13} aria-hidden />
                {anchor.name} · {anchor.startsOn ? formatPlanDate(anchor.startsOn) : "sin fecha"}
              </span>
            )}
            {anchor && span && <span aria-hidden>·</span>}
            {span && (
              <span>
                {formatPlanDate(span.start)} → {formatPlanDate(span.end)} · {span.months}{" "}
                {span.months === 1 ? "mes" : "meses"}
              </span>
            )}
          </p>
        )}
      </div>
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </header>
  )
}
