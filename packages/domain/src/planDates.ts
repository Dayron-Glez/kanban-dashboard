import type { DurationUnit } from "@repo/contracts"

/**
 * Un día como entero: días desde el 1 de enero de 1970, en UTC. El motor de
 * fechas opera con estos enteros y solo convierte a `YYYY-MM-DD` en los bordes.
 */
export type EpochDay = number

const MS_PER_DAY = 86_400_000
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

const fromParts = (year: number, month: number, day: number): EpochDay =>
  Math.round(Date.UTC(year, month - 1, day) / MS_PER_DAY)

const toParts = (day: EpochDay) => {
  const date = new Date(day * MS_PER_DAY)
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() }
}

const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate()

/** Si es una fecha que existe: «2027-02-29» no lo es. */
export function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== "string") return false
  const match = ISO_DATE.exec(value)
  if (!match) return false
  const [year, month, day] = match.slice(1).map(Number) as [number, number, number]
  const parts = toParts(fromParts(year, month, day))
  return parts.year === year && parts.month === month && parts.day === day
}

export function fromIsoDate(value: string): EpochDay {
  if (!isValidIsoDate(value)) throw new Error(`Fecha no válida: ${value}`)
  const [year, month, day] = value.split("-").map(Number) as [number, number, number]
  return fromParts(year, month, day)
}

export function toIsoDate(day: EpochDay): string {
  const { year, month, day: dayOfMonth } = toParts(day)
  const pad = (n: number, width = 2) => String(n).padStart(width, "0")
  return `${pad(year, 4)}-${pad(month)}-${pad(dayOfMonth)}`
}

/** Meses enteros como EDATE de Excel: el mismo día, o el último del mes si no existe. */
export function addMonths(day: EpochDay, months: number): EpochDay {
  const { year, month, day: dayOfMonth } = toParts(day)
  const total = year * 12 + (month - 1) + Math.trunc(months)
  const targetYear = Math.floor(total / 12)
  const targetMonth = total - targetYear * 12 + 1
  return fromParts(
    targetYear,
    targetMonth,
    Math.min(dayOfMonth, daysInMonth(targetYear, targetMonth))
  )
}

// Los meses enteros, como EDATE; la fracción, sobre los días del mes siguiente.
// Devuelve un día con decimales: quien llama redondea hacia abajo.
const addFractionalMonths = (day: EpochDay, months: number): number => {
  const sign = months < 0 ? -1 : 1
  const whole = Math.trunc(Math.abs(months))
  const fraction = Math.abs(months) - whole
  const from = addMonths(day, sign * whole)
  if (fraction < 1e-9) return from
  return from + fraction * (addMonths(day, sign * (whole + 1)) - from)
}

/** El día que queda `amount` unidades después (o antes, si es negativo): desfases. */
export function shiftDay(day: EpochDay, amount: number, unit: DurationUnit): EpochDay {
  switch (unit) {
    case "days":
      return Math.floor(day + amount)
    case "weeks":
      return Math.floor(day + amount * 7)
    case "months":
      return Math.floor(addFractionalMonths(day, amount))
  }
}

/** El último día de algo que empieza en `start` y dura `amount` unidades. */
export function endFromStart(start: EpochDay, amount: number, unit: DurationUnit): EpochDay {
  return shiftDay(start, amount, unit) - 1
}

/** El primer día de algo que termina en `end` (incluido) y dura `amount` unidades. */
export function startFromEnd(end: EpochDay, amount: number, unit: DurationUnit): EpochDay {
  return shiftDay(end + 1, -amount, unit)
}
