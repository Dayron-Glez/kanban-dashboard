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

export const PLAN_ZOOMS = ["dia", "semana", "mes"] as const
/** Lo cerca que se ve el Gantt: una columna por día, por semana o por mes. */
export type PlanZoom = (typeof PLAN_ZOOMS)[number]

/** El alto de cada fila del Gantt: con el zoom «día», el ancho de un día, para que las celdas sean cuadradas. */
export const ROW_HEIGHT = 48

// Píxeles por día y a cuántos días se ajusta un arrastre: con «semana» una semana
// mide 56 px, con «mes» un mes unos 90.
const ZOOM: Record<PlanZoom, { pxPerDay: number; snapDays: number }> = {
  dia: { pxPerDay: ROW_HEIGHT, snapDays: 1 },
  semana: { pxPerDay: 8, snapDays: 7 },
  mes: { pxPerDay: 3, snapDays: 7 },
}

export interface Timeline {
  zoom: PlanZoom
  range: TimelineRange
  pxPerDay: number
  /** A cuántos días se ajusta un arrastre. */
  snapDays: number
  width: number
  days: GridDay[]
  months: ReturnType<typeof monthSegments>
  years: { start: EpochDay; days: number; year: number }[]
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
  now: Date = new Date(),
  zoom: PlanZoom = "dia"
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
  const { pxPerDay, snapDays } = ZOOM[zoom]
  const months = monthSegments(range)
  return {
    zoom,
    range,
    pxPerDay,
    snapDays,
    width: range.days * pxPerDay,
    days: gridDays(range),
    months,
    years: yearSegments(months),
    weeks: weekSegments(range, shootWeek),
    shootWeek,
    today,
  }
}

// Los años, juntando los meses de la rejilla: la cabecera de «semana» y «mes».
const yearSegments = (months: ReturnType<typeof monthSegments>) =>
  months.reduce<{ start: EpochDay; days: number; year: number }[]>((years, month) => {
    const last = years.at(-1)
    if (last?.year === month.year) last.days += month.days
    else years.push({ start: month.start, days: month.days, year: month.year })
    return years
  }, [])

/** Dónde empieza un día en el Gantt, en píxeles. */
export const timelineX = (day: EpochDay, timeline: Timeline) =>
  (day - timeline.range.start) * timeline.pxPerDay

/**
 * Hasta dónde desplazar el Gantt para enseñar un día: queda a un tercio del
 * ancho visible, para que se vea lo que viene después.
 */
export const scrollLeftFor = (day: EpochDay, timeline: Timeline, visibleWidth: number) =>
  Math.max(0, Math.round(timelineX(day, timeline) + timeline.pxPerDay / 2 - visibleWidth / 3))

/** Una celda del Gantt: un día, una semana o un mes, según el zoom. */
export interface TimelineCell {
  start: EpochDay
  days: number
}

/** La celda que contiene un día. */
export function cellAt(timeline: Timeline, day: EpochDay): TimelineCell {
  const { range, zoom } = timeline
  if (zoom === "mes") {
    const month = timeline.months.find((m) => day >= m.start && day < m.start + m.days)
    if (month) return { start: month.start, days: month.days }
  }
  if (zoom === "dia") return { start: day, days: 1 }
  const start = Math.max(mondayOf(day), range.start)
  return { start, days: Math.min(mondayOf(day) + 7, range.end + 1) - start }
}

/** El día bajo un punto del Gantt, en píxeles desde su borde izquierdo. */
export const dayAtX = (timeline: Timeline, px: number): EpochDay =>
  timeline.range.start +
  Math.min(Math.max(Math.floor(px / timeline.pxPerDay), 0), timeline.range.days - 1)

/** La celda bajo un punto del Gantt. */
export const cellAtX = (timeline: Timeline, px: number) => cellAt(timeline, dayAtX(timeline, px))

/** La celda de al lado; en el borde de la rejilla, la misma. */
export function cellStep(timeline: Timeline, cell: TimelineCell, step: -1 | 1): TimelineCell {
  const day = step > 0 ? cell.start + cell.days : cell.start - 1
  return day < timeline.range.start || day > timeline.range.end ? cell : cellAt(timeline, day)
}

/** Las celdas de un día a otro, en cualquier orden, como un solo tramo. */
export function cellSpan(timeline: Timeline, a: EpochDay, b: EpochDay): TimelineCell {
  const first = cellAt(timeline, Math.min(a, b))
  const last = cellAt(timeline, Math.max(a, b))
  return { start: first.start, days: last.start + last.days - first.start }
}

/**
 * El fondo de todas las filas: las líneas entre celdas, los fines de semana
 * sombreados de arriba abajo y la línea de la semana 1. Se calcula una vez y lo
 * comparten todas. La de hoy va aparte (todayX), por encima de las barras.
 */
/** Dónde va la línea de hoy, en píxeles; null si hoy queda fuera de la rejilla. */
export function todayX(timeline: Timeline): number | null {
  const at = timelineX(timeline.today, timeline) + timeline.pxPerDay / 2
  return at >= 0 && at <= timeline.width ? at : null
}

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
  ].filter(({ at }) => at >= 0 && at <= timeline.width)
  // La rejilla empieza en lunes: sábado y domingo son los días 5 y 6 de cada semana.
  // Solo con «día»: más lejos, el sombreado serían rayas de 8 o 3 px.
  const weekend = `repeating-linear-gradient(90deg, transparent 0 ${5 * pxPerDay}px, var(--weekend) ${5 * pxPerDay}px ${7 * pxPerDay}px)`
  const layers = [
    ...lines.map(({ at, color }) => ({
      image: `linear-gradient(${color}, ${color})`,
      size: "1px 100%",
      position: `${at}px 0`,
      repeat: "no-repeat",
    })),
    ...(marks.weekends && timeline.zoom === "dia"
      ? [{ image: weekend, size: "auto", position: "0 0", repeat: "repeat" }]
      : []),
  ]
  layers.push(...cellLines(timeline))
  return {
    backgroundImage: layers.map((layer) => layer.image).join(", "),
    backgroundSize: layers.map((layer) => layer.size).join(", "),
    backgroundPosition: layers.map((layer) => layer.position).join(", "),
    backgroundRepeat: layers.map((layer) => layer.repeat).join(", "),
  }
}

// Una línea al empezar cada celda: cada día o cada semana se repiten; los meses,
// que no miden lo mismo, van uno a uno.
function cellLines(timeline: Timeline) {
  const line = "linear-gradient(90deg, var(--grid-cell) 1px, transparent 1px)"
  if (timeline.zoom !== "mes") {
    const size = timeline.pxPerDay * (timeline.zoom === "dia" ? 1 : 7)
    return [{ image: line, size: `${size}px 100%`, position: "0 0", repeat: "repeat-x" }]
  }
  return timeline.months.map((month) => ({
    image: "linear-gradient(var(--grid-cell), var(--grid-cell))",
    size: "1px 100%",
    position: `${timelineX(month.start, timeline)}px 0`,
    repeat: "no-repeat",
  }))
}

/** Los píxeles arrastrados, en días y ajustados al paso del zoom. */
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
