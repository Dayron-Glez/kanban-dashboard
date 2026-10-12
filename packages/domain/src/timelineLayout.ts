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
