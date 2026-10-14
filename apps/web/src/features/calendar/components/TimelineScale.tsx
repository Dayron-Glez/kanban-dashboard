import { toIsoDate } from "@repo/domain"
import { cn } from "@/shared/index"
import type { GanttFields } from "../lib/ganttFields"
import { formatLongDate } from "../lib/planFormat"
import { timelineX as x, trackBackground, type Timeline, type TimelineMarks } from "../lib/timeline"

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
// Con el signo menos tipográfico: «−27», no «-27».
const signed = (n: number) => (n < 0 ? `−${-n}` : String(n))

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"]

interface TimelineScaleProps {
  timeline: Timeline
  /** Qué filas se ven (campos visibles). */
  rows: Pick<GanttFields, "month" | "week" | "day">
  /** Hoy, la semana 1 y los fines de semana se pueden apagar desde la leyenda. */
  marks?: TimelineMarks
}

/** La cabecera del Gantt: el mes (con el año en enero), la semana desde el rodaje y el día. */
export function TimelineScale({
  timeline,
  rows,
  marks = { today: true, week1: true, weekends: true },
}: Readonly<TimelineScaleProps>) {
  const { pxPerDay, zoom } = timeline
  // Lejos (semana, mes) el año va en su propia fila; de cerca, con enero.
  const yearRow = zoom !== "dia"

  return (
    <div aria-hidden className="text-muted-foreground shrink-0 text-sm tabular-nums">
      {yearRow && (
        <div className="relative h-[26px]" style={{ width: timeline.width }}>
          {timeline.years.map((year) => (
            <span
              key={year.start}
              className="border-border text-foreground absolute inset-y-0 flex items-center overflow-hidden border-l pl-1.5 font-semibold whitespace-nowrap"
              style={{ left: x(year.start, timeline), width: year.days * pxPerDay }}
            >
              {year.year}
            </span>
          ))}
        </div>
      )}
      {rows.month && (
        <div className="relative h-[26px]" style={{ width: timeline.width }}>
          {timeline.months.map((month, index) => (
            <span
              key={month.start}
              className="border-border absolute inset-y-0 flex items-center overflow-hidden border-l pl-1.5 whitespace-nowrap"
              style={{ left: x(month.start, timeline), width: month.days * pxPerDay }}
            >
              {!yearRow && (month.month === 0 || index === 0) ? (
                <span className="text-foreground font-semibold">
                  {MONTHS[month.month]} {month.year}
                </span>
              ) : (
                MONTHS[month.month]
              )}
            </span>
          ))}
        </div>
      )}
      {rows.week && zoom !== "mes" && (
        <div className="relative h-[26px]" style={{ width: timeline.width }}>
          {timeline.weeks.map((week) => (
            <span
              key={week.start}
              title={week.number != null ? `Semana ${signed(week.number)}` : undefined}
              className={cn(
                "border-border/60 absolute inset-y-0 flex items-center overflow-hidden border-l pl-1.5 whitespace-nowrap",
                marks.week1 && week.number === 1 && "bg-primary/10 text-primary font-semibold"
              )}
              style={{ left: x(week.start, timeline), width: week.days * pxPerDay }}
            >
              {week.number != null &&
                (zoom === "dia" ? `Sem ${signed(week.number)}` : signed(week.number))}
            </span>
          ))}
        </div>
      )}
      {rows.day && zoom === "dia" && (
        <div
          className="relative isolate h-[34px]"
          style={{ width: timeline.width, ...trackBackground(timeline, marks) }}
        >
          {timeline.days.map((day) => {
            const today = marks.today && day.day === timeline.today
            return (
              <span
                key={day.day}
                title={formatLongDate(toIsoDate(day.day))}
                className={cn(
                  "absolute inset-y-0 flex flex-col items-center justify-center leading-none",
                  marks.weekends && day.weekend && "text-muted-foreground/60",
                  today &&
                    "text-background before:bg-primary font-bold before:absolute before:inset-[3px] before:-z-10 before:rounded-md"
                )}
                style={{ left: x(day.day, timeline), width: pxPerDay }}
              >
                <span>{day.dayOfMonth}</span>
                <span className="mt-0.5 text-[10px] opacity-75">{WEEKDAYS[day.weekday]}</span>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
