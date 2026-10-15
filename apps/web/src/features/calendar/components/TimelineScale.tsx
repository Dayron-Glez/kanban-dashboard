import { useRef, useState, type MouseEvent, type PointerEvent } from "react"
import { toIsoDate } from "@repo/domain"
import { cn, Tooltip, TooltipContent, TooltipTrigger } from "@/shared/index"
import type { GanttFields } from "../lib/ganttFields"
import { formatLongDate } from "../lib/planFormat"
import { timelineX as x, trackBackground, type Timeline, type TimelineMarks } from "../lib/timeline"
import type { EpochDay } from "@repo/domain"

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
  /** El inicio de la celda bajo el ratón: su día, semana o mes se resalta. */
  hovered?: EpochDay | null
  /** Pulsar un día, una semana o un mes abre el panel del día (el primero). */
  onOpenDay?: (day: EpochDay) => void
}

const HOT = "bg-primary/10 text-foreground"

/** La cabecera del Gantt: el mes (con el año en enero), la semana desde el rodaje y el día. */
export function TimelineScale({
  timeline,
  rows,
  marks = { today: true, week1: true, weekends: true },
  hovered = null,
  onOpenDay,
}: Readonly<TimelineScaleProps>) {
  const { pxPerDay, zoom } = timeline
  // Lejos (semana, mes) el año va en su propia fila; de cerca, con enero.
  const yearRow = zoom !== "dia"
  // La cabecera es para el ratón: con el teclado, el día se abre con Mayús + Enter en la celda.
  const opens = (day: EpochDay) =>
    onOpenDay && {
      onClick: () => onOpenDay(day),
      className: "cursor-pointer hover:bg-muted hover:text-foreground",
    }

  // Arrastrar la cabecera desplaza el Gantt en horizontal. Hasta que el puntero se
  // mueve no se captura: así un clic quieto sigue abriendo el día.
  const pan = useRef<{ x: number; left: number; viewport: HTMLElement; moved: boolean } | null>(
    null
  )
  const panned = useRef<boolean>(false)
  const [panning, setPanning] = useState<boolean>(false)
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || event.pointerType === "touch") return
    const viewport = event.currentTarget.closest<HTMLElement>('[data-slot="scroll-area-viewport"]')
    if (viewport)
      pan.current = { x: event.clientX, left: viewport.scrollLeft, viewport, moved: false }
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = pan.current
    if (!current) return
    const dx = event.clientX - current.x
    if (!current.moved && Math.abs(dx) > 3) {
      current.moved = true
      setPanning(true)
      try {
        event.currentTarget.setPointerCapture?.(event.pointerId)
      } catch {
        // Sin captura, el paneo sigue mientras el puntero no salga de la cabecera.
      }
    }
    if (current.moved) current.viewport.scrollLeft = current.left - dx
  }
  const endPan = () => {
    panned.current = pan.current?.moved ?? false
    pan.current = null
    setPanning(false)
  }
  // Soltar tras desplazar no abre el día que quede debajo.
  const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!panned.current) return
    panned.current = false
    event.stopPropagation()
  }

  return (
    <Tooltip delayDuration={700}>
      <TooltipTrigger asChild>
        <div
          aria-hidden
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPan}
          onPointerCancel={endPan}
          onClickCapture={onClickCapture}
          className={cn(
            "text-muted-foreground shrink-0 text-sm tabular-nums select-none",
            panning ? "cursor-grabbing" : "cursor-grab"
          )}
        >
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
                  className={cn(
                    "border-border absolute inset-y-0 flex items-center overflow-hidden border-l pl-1.5 whitespace-nowrap",
                    zoom === "mes" && month.start === hovered && HOT,
                    zoom === "mes" && opens(month.start)?.className
                  )}
                  onClick={zoom === "mes" ? opens(month.start)?.onClick : undefined}
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
                  title={
                    week.number === 1
                      ? "Semana 1 · empieza el rodaje; de ella se cuentan las demás"
                      : week.number != null
                        ? `Semana ${signed(week.number)}`
                        : undefined
                  }
                  className={cn(
                    "border-border/60 absolute inset-y-0 flex items-center overflow-hidden border-l pl-1.5 whitespace-nowrap",
                    marks.week1 && week.number === 1 && "bg-primary/10 text-primary font-semibold",
                    zoom === "semana" && week.start === hovered && HOT,
                    zoom === "semana" && opens(week.start)?.className
                  )}
                  onClick={zoom === "semana" ? opens(week.start)?.onClick : undefined}
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
                    title={`${formatLongDate(toIsoDate(day.day))}${day.day === timeline.today ? " · hoy" : ""}`}
                    data-hovered={day.day === hovered || undefined}
                    className={cn(
                      "absolute inset-y-0 flex flex-col items-center justify-center leading-none",
                      marks.weekends && day.weekend && "text-muted-foreground/60",
                      day.day === hovered && !today && "bg-primary/10 text-foreground rounded-md",
                      opens(day.day) && "hover:bg-muted cursor-pointer rounded-md",
                      today && "text-foreground"
                    )}
                    onClick={opens(day.day)?.onClick}
                    style={{ left: x(day.day, timeline), width: pxPerDay }}
                  >
                    {/* Hoy: el recuadro solo en el número; la letra, debajo y en su color. */}
                    <span
                      className={cn(
                        today && "bg-primary text-background rounded-md px-1.5 py-0.5 font-bold"
                      )}
                    >
                      {day.dayOfMonth}
                    </span>
                    <span className="mt-0.5 text-[10px] opacity-75">{WEEKDAYS[day.weekday]}</span>
                  </span>
                )
              })}
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        Arrastra las fechas para desplazarte · Mayús + rueda también
      </TooltipContent>
    </Tooltip>
  )
}
