import type { CSSProperties } from "react"
import type { CalendarElement, DatePoint, ElementDependency } from "@repo/contracts"
import {
  fromIsoDate,
  mondayOf,
  monthTicks,
  positionOf,
  timelineRange,
  type EpochDay,
  type MonthTick,
  type TimelineRange,
} from "@repo/domain"

/** Cómo se reparte el árbol: solo la tabla (el móvil), o la tabla y el cronograma. */
export type PlanView = "tabla" | "ambos" | "cronograma"

export type PlanScale = "semanas" | "meses"

/** Píxeles por día de cada escala: con «semanas» una semana mide 42 px. */
const PX_PER_DAY: Record<PlanScale, number> = { semanas: 6, meses: 2 }

export interface Timeline {
  range: TimelineRange
  pxPerDay: number
  width: number
  ticks: MonthTick[]
  /** El lunes de la semana del rodaje, la semana 1. */
  shootWeek: EpochDay | null
  today: EpochDay
  /** A cuántos días se ajusta un arrastre: días con «semanas», semanas con «meses». */
  snapDays: number
}

const day = (iso: string | null) => (iso ? fromIsoDate(iso) : null)

/** Lo que necesita el cronograma para pintarse, o null si nada tiene fechas. */
export function buildTimeline(
  elements: CalendarElement[],
  scale: PlanScale,
  today: Date = new Date()
): Timeline | null {
  const range = timelineRange(
    elements.map((element) => ({ start: day(element.startsOn), end: day(element.endsOn) }))
  )
  if (!range) return null
  const shoot =
    elements.find((element) => element.templateKey === "rodaje") ??
    elements.find((element) => element.isAnchor)
  const pxPerDay = PX_PER_DAY[scale]
  return {
    range,
    pxPerDay,
    width: range.days * pxPerDay,
    ticks: monthTicks(range),
    snapDays: scale === "meses" ? 7 : 1,
    shootWeek: shoot?.startsOn ? mondayOf(fromIsoDate(shoot.startsOn)) : null,
    today: fromIsoDate(
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
    ),
  }
}

/** Dónde cae un día en el cronograma, en píxeles. */
export const timelineX = (day: EpochDay, timeline: Timeline) =>
  positionOf(day, timeline.range) * timeline.width

/**
 * Las líneas de cada mes, de hoy y de la semana 1, como fondo de las pistas:
 * se calcula una vez y todas las filas lo comparten, sin capas encima.
 */
export function trackBackground(timeline: Timeline): CSSProperties {
  const lines = [
    ...timeline.ticks.map((tick) => ({
      at: timelineX(tick.day, timeline),
      color: "var(--border)",
    })),
    ...(timeline.shootWeek != null
      ? [
          {
            at: timelineX(timeline.shootWeek, timeline),
            color: "color-mix(in oklch, var(--primary) 35%, transparent)",
          },
        ]
      : []),
    { at: timelineX(timeline.today, timeline), color: "var(--primary)" },
  ].filter((line) => line.at >= 0 && line.at <= timeline.width)

  return {
    backgroundImage: lines
      .map((line) => `linear-gradient(${line.color}, ${line.color})`)
      .join(", "),
    backgroundSize: lines.map(() => "1px 100%").join(", "),
    backgroundPosition: lines.map((line) => `${line.at}px 0`).join(", "),
    backgroundRepeat: "no-repeat",
  }
}

/** Los píxeles arrastrados, en días y ajustados al paso de la escala. */
export const dragDays = (pixels: number, timeline: Timeline) =>
  Math.round(pixels / timeline.pxPerDay / timeline.snapDays) * timeline.snapDays || 0

export type BarDrag = "move" | "start" | "end"

export type BarDragModes =
  | { locked: false; start: boolean; end: boolean }
  /** Sus dos fechas salen de otros elementos: se mueve con ellos. */
  | { locked: true; by: string[] }

const ruleOn = (dependencies: ElementDependency[], id: string, point: DatePoint) =>
  dependencies.find((rule) => rule.successorId === id && rule.successorPoint === point)

/**
 * Qué se puede arrastrar de una barra con un solo cambio. El cuerpo la mueve
 * entera; el borde del fin siempre cambia solo el fin; el del inicio solo se
 * ofrece si el fin se queda donde está, es decir, si el inicio no tiene regla.
 */
export function barDragModes(
  element: CalendarElement,
  dependencies: ElementDependency[]
): BarDragModes {
  const start = ruleOn(dependencies, element.id, "start")
  const end = ruleOn(dependencies, element.id, "end")
  if (start && end && !element.isAnchor && !element.isPinned) {
    return { locked: true, by: [...new Set([start.predecessorId, end.predecessorId])] }
  }
  const fixed = element.isAnchor || element.isPinned
  return { locked: false, start: !fixed && !start && end != null, end: element.endsOn != null }
}

/**
 * La fecha que hay que escribir para un arrastre. Mover entera una barra que
 * cuelga del fin de otra reescribe ese desfase; si no, se escribe el inicio.
 */
export function dragTarget(
  element: CalendarElement,
  dependencies: ElementDependency[],
  drag: BarDrag,
  days: number
): { point: DatePoint; date: EpochDay } | null {
  const start = element.startsOn ? fromIsoDate(element.startsOn) : null
  const end = element.endsOn ? fromIsoDate(element.endsOn) : null
  const byEnd =
    drag === "end" ||
    (drag === "move" &&
      !element.isAnchor &&
      !element.isPinned &&
      !ruleOn(dependencies, element.id, "start") &&
      ruleOn(dependencies, element.id, "end") != null)
  if (byEnd) return end == null ? null : { point: "end", date: end + days }
  return start == null ? null : { point: "start", date: start + days }
}
