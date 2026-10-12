import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react"
import type { CalendarElement, Duration } from "@repo/contracts"
import { fromIsoDate, toIsoDate, type EpochDay } from "@repo/domain"
import { cn } from "@/shared/index"
import { formatDuration, formatPlanDate } from "../lib/planFormat"
import {
  dragDays,
  timelineX,
  type BarDrag,
  type BarDragModes,
  type Timeline,
} from "../lib/timeline"

interface TimelineBarProps {
  element: CalendarElement
  /** Las fases llevan una barra más alta, con su duración dentro. */
  isPhase: boolean
  color: string
  timeline: Timeline
  selected: boolean
  tooltip: string
  /** null si no se puede arrastrar: un miembro, o mientras se guarda otro cambio. */
  modes: BarDragModes | null
  onOpen: () => void
  onDrag: (drag: BarDrag, days: number) => void
}

interface DragState {
  drag: BarDrag
  originX: number
  days: number
  moved: boolean
}

const short = (day: EpochDay) => formatPlanDate(toIsoDate(day)).replace(/ \d{4}$/, "")

// Las fechas mientras se arrastra: el borde que se suelta no cruza el otro.
function draggedSpan(start: EpochDay, end: EpochDay | null, state: DragState | null) {
  if (!state || state.days === 0) return { start, end }
  const { drag, days } = state
  if (drag === "move") return { start: start + days, end: end == null ? null : end + days }
  if (drag === "start") return { start: Math.min(start + days, end ?? start), end }
  return { start, end: end == null ? null : Math.max(end + days, start) }
}

/** Una barra del cronograma: se abre con un clic y se mueve arrastrándola o con las flechas. */
export function TimelineBar({
  element,
  isPhase,
  color,
  timeline,
  selected,
  tooltip,
  modes,
  onOpen,
  onDrag,
}: Readonly<TimelineBarProps>) {
  const [state, setState] = useState<DragState | null>(null)
  const dragged = useRef<boolean>(false)
  if (!element.startsOn) return null

  const start = fromIsoDate(element.startsOn)
  const end = element.endsOn ? fromIsoDate(element.endsOn) : null
  const span = draggedSpan(start, end, state)
  const free = modes != null && !modes.locked ? modes : null
  const draggable = free != null
  const x = (day: EpochDay) => timelineX(day, timeline)
  const width = (from: EpochDay, to: EpochDay) => Math.max(x(to) - x(from) + timeline.pxPerDay, 3)

  const begin = (drag: BarDrag) => (event: PointerEvent<HTMLElement>) => {
    if (!draggable || event.button !== 0) return
    event.stopPropagation()
    setState({ drag, originX: event.clientX, days: 0, moved: false })
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId)
    } catch {
      // Sin captura el arrastre sigue, mientras el puntero no salga de la barra.
    }
  }

  const move = (event: PointerEvent<HTMLElement>) => {
    if (!state) return
    const pixels = event.clientX - state.originX
    setState({
      ...state,
      days: dragDays(pixels, timeline),
      moved: state.moved || Math.abs(pixels) > 3,
    })
  }

  const finish = () => {
    if (!state) return
    // Un arrastre no abre el inspector al soltar.
    dragged.current = state.moved
    if (state.moved && state.days !== 0) onDrag(state.drag, state.days)
    setState(null)
  }

  // ← → mueven un día; con Mayús, una semana; con Alt, solo el fin.
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!free || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return
    event.preventDefault()
    const days = (event.key === "ArrowLeft" ? -1 : 1) * (event.shiftKey ? 7 : 1)
    if (event.altKey && !free.end) return
    onDrag(event.altKey ? "end" : "move", days)
  }

  const handle = (drag: "start" | "end") => (
    <span
      aria-hidden
      onPointerDown={begin(drag)}
      className={cn(
        "absolute inset-y-0 z-10 w-2 cursor-ew-resize",
        drag === "start" ? "-left-1" : "-right-1"
      )}
    />
  )

  const ghost = state != null && state.days !== 0 && (
    <span
      aria-hidden
      className="border-foreground/40 bg-foreground/5 absolute top-1/2 -translate-y-1/2 rounded-[5px] border border-dashed"
      style={{
        left: x(start),
        width: end == null ? 10 : width(start, end),
        height: isPhase ? 18 : 14,
      }}
    />
  )

  const dates = state != null && state.days !== 0 && (
    <span
      aria-hidden
      className="bg-foreground text-background pointer-events-none absolute -top-1 z-20 -translate-y-full rounded px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap tabular-nums shadow-sm"
      style={{ left: x(span.start) }}
    >
      {short(span.start)}
      {span.end != null && ` → ${short(span.end)}`}
    </span>
  )

  const common = {
    type: "button" as const,
    "aria-label": tooltip.split(" · ")[0],
    "aria-keyshortcuts": draggable ? "ArrowLeft ArrowRight" : undefined,
    title: tooltip,
    onKeyDown,
    onClick: () => {
      if (dragged.current) {
        dragged.current = false
        return
      }
      onOpen()
    },
  }

  const pointer = {
    onPointerDown: begin("move"),
    onPointerMove: move,
    onPointerUp: finish,
    onPointerCancel: () => setState(null),
  }

  if (span.end == null) {
    // Sin fin: un punto y una estela que se desvanece.
    return (
      <>
        {ghost}
        {dates}
        <button
          {...common}
          {...pointer}
          className={cn(
            "absolute top-1/2 flex -translate-y-1/2 touch-none items-center",
            draggable && "cursor-grab",
            state?.moved && "cursor-grabbing"
          )}
          style={{ left: x(span.start) }}
        >
          <span className="size-2.5 rounded-full border-2" style={{ borderColor: color }} />
          <span
            className="h-0.5 w-8"
            style={{ background: `linear-gradient(90deg, ${color}, transparent)` }}
          />
        </button>
      </>
    )
  }

  const barWidth = width(span.start, span.end)
  const duration: Duration | null = element.duration
  return (
    <>
      {ghost}
      {dates}
      <div
        {...pointer}
        className="absolute top-1/2 -translate-y-1/2 touch-none"
        style={{ left: x(span.start), width: barWidth, height: isPhase ? 18 : 14 }}
      >
        <button
          {...common}
          className={cn(
            "absolute inset-0 overflow-hidden rounded-[5px] text-left transition-shadow",
            draggable && "cursor-grab",
            state?.moved && "cursor-grabbing shadow-md",
            selected && "ring-primary ring-offset-background ring-2 ring-offset-1"
          )}
          style={{ backgroundColor: color }}
        >
          {isPhase && duration && barWidth > 64 && (
            <span className="text-background absolute inset-y-0 left-2 flex items-center text-[11px] font-semibold whitespace-nowrap">
              {formatDuration(duration)}
            </span>
          )}
        </button>
        {free?.start && handle("start")}
        {free?.end && handle("end")}
      </div>
    </>
  )
}
