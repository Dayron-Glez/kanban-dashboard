import { fromIsoDate } from "@repo/domain"
import { cn } from "@/shared/index"
import type { PhaseTint } from "../lib/phaseColors"
import { formatPlanDate } from "../lib/planFormat"

/** Dónde se sitúa: el elemento del que cuelga, o el plan entero si es una fase. */
export interface PlaceContext {
  name: string
  start: string
  end: string
}

interface PlaceInParentProps {
  context: PlaceContext | null
  startsOn: string | null
  endsOn: string | null
  /** El color de su fase. */
  tint: PhaseTint
}

const daysBetween = (start: string, end: string) => fromIsoDate(end) - fromIsoDate(start) + 1

/**
 * El sitio de un elemento dentro de lo que lo contiene: las fechas encima y una
 * pista debajo con su tramo, para que la barra nunca tape el texto.
 */
export function PlaceInParent({ context, startsOn, endsOn, tint }: Readonly<PlaceInParentProps>) {
  if (!context || !startsOn) return null
  const total = daysBetween(context.start, context.end)
  const left = ((fromIsoDate(startsOn) - fromIsoDate(context.start)) / total) * 100
  const width = endsOn ? (daysBetween(startsOn, endsOn) / total) * 100 : 1
  return (
    <div className="flex flex-col gap-1.5 px-1" aria-hidden>
      <div className="text-muted-foreground flex justify-between gap-2 text-sm tabular-nums">
        <span className="truncate">
          {context.name} · {formatPlanDate(context.start)}
        </span>
        <span className="shrink-0">{formatPlanDate(context.end)}</span>
      </div>
      <div className="bg-muted relative h-1.5 overflow-hidden rounded-full">
        <div
          className={cn("absolute inset-y-0 rounded-full", tint.className)}
          style={{
            ...tint.style,
            left: `${Math.min(Math.max(left, 0), 99)}%`,
            width: `${Math.max(Math.min(width, 100 - Math.max(left, 0)), 1)}%`,
          }}
        />
      </div>
    </div>
  )
}
