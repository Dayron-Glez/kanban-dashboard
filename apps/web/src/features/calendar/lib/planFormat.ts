import type { CalendarElement, DatePoint, Duration, ElementDependency } from "@repo/contracts"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

const UNIT_LABELS: Record<Duration["unit"], [singular: string, plural: string]> = {
  days: ["día", "días"],
  weeks: ["semana", "semanas"],
  months: ["mes", "meses"],
}

export const DURATION_UNIT_OPTIONS = (Object.keys(UNIT_LABELS) as Duration["unit"][]).map(
  (unit) => ({ value: unit, label: UNIT_LABELS[unit][1] })
)

const number = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 })

/** «6 semanas», «1 mes», «2,5 semanas». */
export function formatDuration({ amount, unit }: Duration): string {
  const [singular, plural] = UNIT_LABELS[unit]
  return `${number.format(amount)} ${Math.abs(amount) === 1 ? singular : plural}`
}

/** «5 abr 2027». */
export const formatPlanDate = (iso: string) => format(parseISO(iso), "d MMM yyyy", { locale: es })

const POINT_LABELS: Record<DatePoint, string> = { start: "inicio", end: "fin" }

const signed = (lag: ElementDependency["lag"]) =>
  `${lag.amount > 0 ? "+" : "−"}${formatDuration({ amount: Math.abs(lag.amount), unit: lag.unit })}`

const isDays = (lag: ElementDependency["lag"], amount: number) =>
  lag.unit === "days" && lag.amount === amount

/**
 * La regla que coloca un elemento, en palabras del productor. Vacía cuando
 * empieza con el elemento del que cuelga, que es lo esperado.
 */
export function describeRule(
  element: CalendarElement,
  dependencies: ElementDependency[],
  nameOf: (id: string) => string
): string | null {
  if (element.isAnchor) return "Fecha clave"
  if (element.isPinned) return "Fecha fija"
  const start = dependencies.find(
    (dependency) => dependency.successorId === element.id && dependency.successorPoint === "start"
  )
  const end = dependencies.find(
    (dependency) => dependency.successorId === element.id && dependency.successorPoint === "end"
  )

  if (
    start &&
    end &&
    start.predecessorId === end.predecessorId &&
    start.predecessorPoint === "start" &&
    end.predecessorPoint === "end" &&
    start.lag.amount === 0 &&
    end.lag.amount === 0
  ) {
    return `Ocupa lo mismo que ${nameOf(start.predecessorId)}`
  }
  if (start) {
    const other = nameOf(start.predecessorId)
    if (start.predecessorPoint === "start" && start.lag.amount === 0) {
      return start.predecessorId === element.parentId ? null : `Con el inicio de ${other}`
    }
    if (start.predecessorPoint === "end" && isDays(start.lag, 1)) return `Tras el fin de ${other}`
    if (start.lag.amount === 0) return `Con el ${POINT_LABELS[start.predecessorPoint]} de ${other}`
    return `${signed(start.lag)} ${POINT_LABELS[start.predecessorPoint]} de ${other}`
  }
  if (end) {
    const other = nameOf(end.predecessorId)
    if (end.predecessorPoint === "start" && isDays(end.lag, -1))
      return `Antes del inicio de ${other}`
    if (end.lag.amount === 0)
      return `Acaba con el ${POINT_LABELS[end.predecessorPoint]} de ${other}`
    return `Acaba ${signed(end.lag)} ${POINT_LABELS[end.predecessorPoint]} de ${other}`
  }
  return null
}

const ISSUE_LABELS = {
  "missing-date": "Falta la fecha",
  "missing-duration": "Falta la duración",
  unscheduled: "Sin regla",
} as const

/** Por qué no tiene fecha, en corto, para el hueco de la fecha que falta. */
export function describeIssue(
  issue: NonNullable<CalendarElement["issue"]>,
  nameOf: (id: string) => string
): string {
  return issue.code === "missing-dependency"
    ? `Falta la fecha de ${nameOf(issue.elementId)}`
    : ISSUE_LABELS[issue.code]
}

export interface SetupStep {
  element: CalendarElement
  field: "fixedStart" | "duration"
  label: string
}

const SETUP: [templateKey: string, field: SetupStep["field"]][] = [
  ["rodaje", "fixedStart"],
  ["rodaje", "duration"],
  ["preparacion", "duration"],
  ["softpre", "duration"],
  ["postproduccion", "duration"],
  ["desarrollo", "fixedStart"],
  ["desarrollo", "duration"],
]

/** Lo mínimo que falta para que el plan salga solo, en el orden en que conviene escribirlo. */
export function missingSetup(elements: CalendarElement[]): SetupStep[] {
  return SETUP.flatMap(([templateKey, field]) => {
    const element = elements.find((candidate) => candidate.templateKey === templateKey)
    if (!element) return []
    const missing = field === "duration" ? !element.duration : !element.startsOn
    if (!missing) return []
    const label =
      field === "duration" ? `Duración de ${element.name}` : `Fecha de inicio de ${element.name}`
    return [{ element, field, label }]
  })
}
