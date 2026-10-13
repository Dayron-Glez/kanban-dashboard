import type { CSSProperties } from "react"
import type { CalendarElement, DatePoint, ElementDependency } from "@repo/contracts"
import {
  dayGridRange,
  fromIsoDate,
  gridDays,
  mondayOf,
  monthSegments,
  weekSegments,
  type EpochDay,
  type GridDay,
  type TimelineRange,
} from "@repo/domain"

/** Cómo se ve el árbol: solo la tabla (el móvil), o la tabla junto al Gantt. */
export type PlanView = "tabla" | "gantt"

/** El ancho de cada día del Gantt, en píxeles. */
export const DAY_WIDTH = 28

export interface Timeline {
  range: TimelineRange
  pxPerDay: number
  width: number
  days: GridDay[]
  months: ReturnType<typeof monthSegments>
  weeks: ReturnType<typeof weekSegments>
  /** El lunes de la semana del rodaje, la semana 1. */
  shootWeek: EpochDay | null
  today: EpochDay
}

const day = (iso: string | null) => (iso ? fromIsoDate(iso) : null)

const localToday = (today: Date) =>
  fromIsoDate(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
  )

/** Lo que necesita el Gantt día a día para pintarse, o null si nada tiene fechas. */
export function buildTimeline(
  elements: CalendarElement[],
  now: Date = new Date()
): Timeline | null {
  const today = localToday(now)
  const range = dayGridRange(
    elements.map((element) => ({ start: day(element.startsOn), end: day(element.endsOn) })),
    [today]
  )
  if (!range) return null
  const shoot =
    elements.find((element) => element.templateKey === "rodaje") ??
    elements.find((element) => element.isAnchor)
  const shootWeek = shoot?.startsOn ? mondayOf(fromIsoDate(shoot.startsOn)) : null
  return {
    range,
    pxPerDay: DAY_WIDTH,
    width: range.days * DAY_WIDTH,
    days: gridDays(range),
    months: monthSegments(range),
    weeks: weekSegments(range, shootWeek),
    shootWeek,
    today,
  }
}

/** Dónde empieza un día en el Gantt, en píxeles. */
export const timelineX = (day: EpochDay, timeline: Timeline) =>
  (day - timeline.range.start) * timeline.pxPerDay

/**
 * Hasta dónde desplazar el Gantt para enseñar un día: queda a un tercio del
 * ancho visible, para que se vea lo que viene después.
 */
export const scrollLeftFor = (day: EpochDay, timeline: Timeline, visibleWidth: number) =>
  Math.max(0, Math.round(timelineX(day, timeline) + timeline.pxPerDay / 2 - visibleWidth / 3))

/**
 * El fondo de todas las filas: los fines de semana sombreados de arriba abajo y
 * las líneas de hoy y de la semana 1. Se calcula una vez y lo comparten todas.
 */
export interface TimelineMarks {
  today: boolean
  week1: boolean
  weekends: boolean
}

const ALL_MARKS: TimelineMarks = { today: true, week1: true, weekends: true }

export function trackBackground(
  timeline: Timeline,
  marks: TimelineMarks = ALL_MARKS
): CSSProperties {
  const { pxPerDay } = timeline
  const line = (at: number, color: string) => ({ at, color })
  const lines = [
    ...(marks.week1 && timeline.shootWeek != null
      ? [
          line(
            timelineX(timeline.shootWeek, timeline),
            "color-mix(in oklch, var(--primary) 40%, transparent)"
          ),
        ]
      : []),
    ...(marks.today
      ? [line(timelineX(timeline.today, timeline) + pxPerDay / 2, "var(--primary)")]
      : []),
  ].filter(({ at }) => at >= 0 && at <= timeline.width)
  // La rejilla empieza en lunes: sábado y domingo son los días 5 y 6 de cada semana.
  const weekend = `repeating-linear-gradient(90deg, transparent 0 ${5 * pxPerDay}px, var(--weekend) ${5 * pxPerDay}px ${7 * pxPerDay}px)`
  const layers = [
    ...lines.map(({ at, color }) => ({
      image: `linear-gradient(${color}, ${color})`,
      size: "1px 100%",
      position: `${at}px 0`,
      repeat: "no-repeat",
    })),
    ...(marks.weekends
      ? [{ image: weekend, size: "auto", position: "0 0", repeat: "repeat" }]
      : []),
  ]
  if (layers.length === 0) return {}
  return {
    backgroundImage: layers.map((layer) => layer.image).join(", "),
    backgroundSize: layers.map((layer) => layer.size).join(", "),
    backgroundPosition: layers.map((layer) => layer.position).join(", "),
    backgroundRepeat: layers.map((layer) => layer.repeat).join(", "),
  }
}

/** Los píxeles arrastrados, en días enteros. */
export const dragDays = (pixels: number, timeline: Timeline) =>
  Math.round(pixels / timeline.pxPerDay) || 0

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
