import { weekNumber } from "@repo/domain"
import { timelineX as x, type Timeline } from "../lib/timeline"

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]

interface TimelineScaleProps {
  timeline: Timeline
}

/** La escala de arriba: el año en enero, los meses y dónde empieza la semana 1. */
export function TimelineScale({ timeline }: Readonly<TimelineScaleProps>) {
  const { ticks, shootWeek } = timeline
  const monthWidth = 30 * timeline.pxPerDay

  return (
    <div
      aria-hidden
      className="text-muted-foreground relative shrink-0 tabular-nums"
      style={{ width: timeline.width }}
    >
      {ticks.map((tick, index) => {
        // El mes que coincide con la marca de la semana 1 le cede el sitio.
        const crowded =
          shootWeek != null && Math.abs(x(tick.day, timeline) - x(shootWeek, timeline)) < 44
        return crowded && tick.month !== 0 ? null : (
          <span
            key={tick.day}
            className="absolute top-1/2 -translate-y-1/2 pl-1.5 text-[11px] whitespace-nowrap"
            style={{ left: x(tick.day, timeline) }}
          >
            {tick.month === 0 || index === 0 ? (
              <span className="text-foreground font-semibold">
                {monthWidth >= 40 ? `${MONTHS[tick.month]} ` : ""}
                {tick.year}
              </span>
            ) : (
              monthWidth >= 40 && MONTHS[tick.month]
            )}
          </span>
        )
      })}
      {shootWeek != null && (
        <span
          className="bg-primary/10 text-primary absolute top-1/2 -translate-y-1/2 rounded px-1.5 text-[11px] font-semibold whitespace-nowrap"
          style={{ left: x(shootWeek, timeline) + 2 }}
        >
          Sem {weekNumber(shootWeek, shootWeek)}
        </span>
      )}
    </div>
  )
}
