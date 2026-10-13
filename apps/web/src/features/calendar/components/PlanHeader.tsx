import type { ReactNode } from "react"
import { IconAlertTriangle, IconAnchor, IconCalendarEvent } from "@tabler/icons-react"
import { cn } from "@/shared/index"
import { formatPlanDate, type PlanSummary } from "../lib/planFormat"

interface PlanHeaderProps {
  /** El título de la pantalla: el selector de vista. */
  title: ReactNode
  summary: PlanSummary
  /** Los controles de la vista, a la derecha. */
  actions?: ReactNode
}

function Chip({
  children,
  tone = "neutral",
  title,
}: Readonly<{ children: ReactNode; tone?: "neutral" | "anchor" | "warn"; title?: string }>) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium whitespace-nowrap",
        tone === "neutral" && "bg-muted text-muted-foreground",
        tone === "anchor" && "bg-primary/10 text-primary",
        tone === "warn" && "bg-warn-soft text-warn"
      )}
    >
      {children}
    </span>
  )
}

/** El plan en una línea: su fecha clave, de dónde a dónde va y lo que le falta. */
export function PlanHeader({ title, summary, actions }: Readonly<PlanHeaderProps>) {
  const { anchor, span, phasesWithoutDuration } = summary

  return (
    <header className="flex flex-wrap items-center gap-2">
      <div className="mr-1">{title}</div>
      {anchor && (
        <Chip tone={anchor.startsOn ? "anchor" : "warn"} title="La fecha clave del plan">
          <IconAnchor size={13} aria-hidden />
          {anchor.name} · {anchor.startsOn ? formatPlanDate(anchor.startsOn) : "sin fecha"}
        </Chip>
      )}
      {span && (
        <Chip>
          <IconCalendarEvent size={13} aria-hidden />
          <span className="tabular-nums">
            {formatPlanDate(span.start)} → {formatPlanDate(span.end)} · {span.months}{" "}
            {span.months === 1 ? "mes" : "meses"}
          </span>
        </Chip>
      )}
      {phasesWithoutDuration > 0 && (
        <Chip tone="warn">
          <IconAlertTriangle size={13} aria-hidden />
          {phasesWithoutDuration === 1
            ? "1 fase sin duración"
            : `${phasesWithoutDuration} fases sin duración`}
        </Chip>
      )}
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </header>
  )
}
