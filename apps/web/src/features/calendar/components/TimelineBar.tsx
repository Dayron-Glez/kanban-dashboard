import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react"
import type { CalendarElement, Duration } from "@repo/contracts"
import { fromIsoDate, spanOf, type EpochDay } from "@repo/domain"
import { cn } from "@/shared/index"
import { PHASE_TEXT, type PhaseTint } from "../lib/phaseColors"
import { formatDuration, formatShortDay as short } from "../lib/planFormat"
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
  /** El color de su fase (ver phaseTint). */
  tint: PhaseTint
  timeline: Timeline
  selected: boolean
  tooltip: string
  /** null si no se puede arrastrar: un miembro, o mientras se guarda otro cambio. */
  modes: BarDragModes | null
  onOpen: () => void
  onDrag: (drag: BarDrag, days: number) => void
  /** Los fines de semana algo más oscuros dentro de la barra (se apagan desde la leyenda). */
  weekends?: boolean
  /** Hasta dónde se puede llegar: el arrastre se para en el tope y dice por qué. */
  limit?: (drag: BarDrag, days: number) => { days: number; reason: string | null }
}

interface DragState {
  drag: BarDrag
  originX: number
  days: number
  /** Los días que pide el puntero, antes del tope. */
  wanted: number
  moved: boolean
  /** Por qué se ha parado antes de donde está el puntero. */
  reason: string | null
}

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
  tint,
  timeline,
  selected,
  tooltip,
  modes,
  onOpen,
  onDrag,
  limit,
  weekends = true,
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
  // Los fines de semana dentro de la barra, algo más oscuros: la rejilla empieza en
  // lunes, así que basta con desplazar el patrón el día de la semana del inicio.
  const weekendsInside = (from: EpochDay) => {
    const day = timeline.pxPerDay
    return {
      backgroundImage: `repeating-linear-gradient(90deg, transparent 0 ${5 * day}px, color-mix(in oklch, var(--background) 22%, transparent) ${5 * day}px ${7 * day}px)`,
      backgroundPosition: `${-((from - timeline.range.start) % 7) * day}px 0`,
    }
  }
  const width = (from: EpochDay, to: EpochDay) =>
    Math.max(spanOf(from, to, timeline.range) * timeline.width, 3)

  const begin = (drag: BarDrag) => (event: PointerEvent<HTMLElement>) => {
    if (!draggable || event.button !== 0) return
    event.stopPropagation()
    setState({ drag, originX: event.clientX, days: 0, wanted: 0, moved: false, reason: null })
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId)
    } catch {
      // Sin captura el arrastre sigue, mientras el puntero no salga de la barra.
    }
  }

  const move = (event: PointerEvent<HTMLElement>) => {
    if (!state) return
    const pixels = event.clientX - state.originX
    const wanted = dragDays(pixels, timeline)
    // El tope solo se busca al saltar de día o de semana, no en cada píxel.
    const limited =
      wanted === state.wanted
        ? { days: state.days, reason: state.reason }
        : (limit?.(state.drag, wanted) ?? { days: wanted, reason: null })
    setState({
      ...state,
      wanted,
      days: limited.days,
      reason: limited.reason,
      moved: state.moved || Math.abs(pixels) > 3,
    })
  }

  const finish = () => {
    if (!state) return
    // Un arrastre no abre el inspector al soltar.
    dragged.current = state.moved
    // Lo que pidió el puntero: la página lo recorta igual y así puede decir que lo ajustó.
    if (state.moved && state.wanted !== 0) onDrag(state.drag, state.wanted)
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
      className="border-foreground/40 bg-foreground/5 absolute top-[13px] -translate-y-1/2 rounded-[5px] border border-dashed"
      style={{
        left: x(start),
        width: end == null ? 10 : width(start, end),
        height: isPhase ? 18 : 14,
      }}
    />
  )

  const dates = state != null && (state.days !== 0 || state.reason != null) && (
    <span
      aria-hidden
      className="bg-foreground text-background pointer-events-none absolute -top-1 z-20 -translate-y-full rounded px-1.5 py-0.5 text-sm font-medium whitespace-nowrap tabular-nums shadow-sm"
      style={{ left: x(span.start) }}
    >
      {short(span.start)}
      {span.end != null && ` → ${short(span.end)}`}
      {state?.reason && ` · tope: ${state.reason}`}
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
          data-bar
          className={cn(
            "phase-ink absolute top-[13px] flex -translate-y-1/2 touch-none items-center",
            draggable && "cursor-grab",
            state?.moved && "cursor-grabbing"
          )}
          style={{ ...tint.style, left: x(span.start) }}
        >
          <span className="size-2.5 rounded-full border-2 border-current" />
          <span
            className="h-0.5 w-8"
            style={{ background: "linear-gradient(90deg, currentColor, transparent)" }}
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
        data-bar
        className="absolute top-[13px] -translate-y-1/2 touch-none"
        style={{ left: x(span.start), width: barWidth, height: isPhase ? 18 : 14 }}
      >
        <button
          {...common}
          className={cn(
            "absolute inset-0 overflow-hidden rounded-[5px] text-left transition-shadow",
            tint.className,
            draggable && "cursor-grab",
            state?.moved && "cursor-grabbing shadow-md",
            selected && "ring-primary ring-offset-background ring-2 ring-offset-1"
          )}
          style={{ ...tint.style, ...(weekends && weekendsInside(span.start)) }}
        >
          {isPhase && duration && barWidth > 64 && (
            <span
              className="absolute inset-y-0 left-2 flex items-center text-sm font-semibold whitespace-nowrap"
              style={{ color: PHASE_TEXT }}
            >
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
