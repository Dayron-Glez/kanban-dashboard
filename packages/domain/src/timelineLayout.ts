import { addMonths, fromIsoDate, toIsoDate, type EpochDay } from "./planDates.js"

export interface TimelineRange {
  start: EpochDay
  end: EpochDay
  /** Días que abarca, ambos extremos incluidos. */
  days: number
}

/** El lunes de la semana de un día (las semanas van de lunes a domingo). */
export function mondayOf(day: EpochDay): EpochDay {
  // El 1 de enero de 1970 fue jueves: el lunes de esa semana es el día −3.
  return day - ((((day + 3) % 7) + 7) % 7)
}

/**
 * La semana de un día contada desde la del rodaje: 1 la del inicio de rodaje,
 * 2, 3… las siguientes, y −1, −2… las anteriores. No hay semana 0.
 */
export function weekNumber(day: EpochDay, shootWeekMonday: EpochDay): number {
  const weeks = Math.round((mondayOf(day) - shootWeekMonday) / 7)
  return weeks >= 0 ? weeks + 1 : weeks
}

/**
 * Lo que abarca el cronograma: de lo primero que empieza a lo último que
 * acaba, con margen a los dos lados. Null si nada tiene fechas.
 */
export function timelineRange(
  dates: { start: EpochDay | null; end: EpochDay | null }[],
  marginDays = 14
): TimelineRange | null {
  const days = dates.flatMap(({ start, end }) =>
    [start, end].filter((day): day is EpochDay => day != null)
  )
  if (days.length === 0) return null
  const start = Math.min(...days) - marginDays
  const end = Math.max(...days) + marginDays
  return { start, end, days: end - start + 1 }
}

/** Dónde cae un día en el cronograma, de 0 (su primer día) a 1 (tras el último). */
export const positionOf = (day: EpochDay, range: TimelineRange) => (day - range.start) / range.days

/** El ancho de algo que va de `start` a `end`, ambos incluidos, como fracción del cronograma. */
export const spanOf = (start: EpochDay, end: EpochDay, range: TimelineRange) =>
  (end - start + 1) / range.days

export interface MonthTick {
  day: EpochDay
  /** 0 = enero. */
  month: number
  year: number
}

/** El primer día de cada mes que cae dentro del cronograma. */
export function monthTicks(range: TimelineRange): MonthTick[] {
  const [year, month] = toIsoDate(range.start).split("-").map(Number) as [number, number]
  const ticks: MonthTick[] = []
  for (
    let day = fromIsoDate(`${year}-${String(month).padStart(2, "0")}-01`);
    day <= range.end;
    day = addMonths(day, 1)
  ) {
    if (day < range.start) continue
    const [tickYear, tickMonth] = toIsoDate(day).split("-").map(Number) as [number, number]
    ticks.push({ day, month: tickMonth - 1, year: tickYear })
  }
  return ticks
}

/**
 * La rejilla del Gantt día a día, como en el prototipo: del lunes de la semana
 * en que empieza lo primero a 14 días después de lo último que acaba (el
 * margen final). Abarca también `include` (hoy), para poder centrarse en él
 * aunque el plan no lo toque. Null si nada tiene fechas.
 */
export function dayGridRange(
  dates: { start: EpochDay | null; end: EpochDay | null }[],
  include: EpochDay[] = [],
  marginEnd = 14
): TimelineRange | null {
  const days = dates.flatMap(({ start, end }) =>
    [start, end].filter((day): day is EpochDay => day != null)
  )
  if (days.length === 0) return null
  const start = mondayOf(Math.min(...days, ...include))
  const end = Math.max(Math.max(...days) + marginEnd, ...include)
  return { start, end, days: end - start + 1 }
}

export interface GridDay {
  day: EpochDay
  /** 0 = lunes … 6 = domingo. */
  weekday: number
  weekend: boolean
  dayOfMonth: number
}

/** Cada día de la rejilla, con lo que necesita su columna. */
export function gridDays(range: TimelineRange): GridDay[] {
  return Array.from({ length: range.days }, (_, index) => {
    const day = range.start + index
    const weekday = day - mondayOf(day)
    return { day, weekday, weekend: weekday >= 5, dayOfMonth: Number(toIsoDate(day).slice(8)) }
  })
}

export interface GridSegment {
  start: EpochDay
  /** Días del tramo que caen dentro de la rejilla. */
  days: number
}

/** Los meses de la rejilla, recortados a sus bordes: el primero puede empezar a medias. */
export function monthSegments(range: TimelineRange): (GridSegment & Omit<MonthTick, "day">)[] {
  const starts = monthTicks(range)
  if (starts[0]?.day !== range.start) {
    const [year, month] = toIsoDate(range.start).split("-").map(Number) as [number, number]
    starts.unshift({ day: range.start, month: month - 1, year })
  }
  return starts.map((tick, index) => ({
    start: tick.day,
    days: (starts[index + 1]?.day ?? range.end + 1) - tick.day,
    month: tick.month,
    year: tick.year,
  }))
}

/**
 * Las semanas de la rejilla (de lunes a domingo, recortadas a sus bordes) con su
 * número contado desde la del rodaje, o null si el rodaje no tiene fecha.
 */
export function weekSegments(
  range: TimelineRange,
  shootWeekMonday: EpochDay | null
): (GridSegment & { number: number | null })[] {
  const segments: (GridSegment & { number: number | null })[] = []
  for (let start = range.start; start <= range.end; start = mondayOf(start) + 7) {
    const end = Math.min(mondayOf(start) + 6, range.end)
    segments.push({
      start,
      days: end - start + 1,
      number: shootWeekMonday == null ? null : weekNumber(start, shootWeekMonday),
    })
  }
  return segments
}
