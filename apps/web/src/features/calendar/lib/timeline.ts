import type { CSSProperties } from "react"
import type { CalendarElement } from "@repo/contracts"
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

export const PLAN_VIEWS = ["tabla", "ambos", "cronograma"] as const
export type PlanView = (typeof PLAN_VIEWS)[number]

export const PLAN_SCALES = ["semanas", "meses"] as const
export type PlanScale = (typeof PLAN_SCALES)[number]

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
