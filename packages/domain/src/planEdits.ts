import type { DatePoint, DurationUnit } from "@repo/contracts"
import { endFromStart, shiftDay, startFromEnd, type EpochDay } from "./planDates.js"
import type { ScheduleDependency, ScheduledDates, ScheduleElement } from "./schedule.js"

interface Amount {
  amount: number
  unit: DurationUnit
}

/** Lo que hay que guardar para que una fecha escrita a mano salga del cálculo. */
export type PlanEdit =
  | { kind: "fixed-start"; date: EpochDay }
  | { kind: "pin"; date: EpochDay }
  | { kind: "lag"; point: DatePoint; lag: Amount }
  | { kind: "duration"; duration: Amount }

export type PlanEditError =
  /** Depende de algo que no tiene la fecha de la que partir. */
  | "missing-reference"
  /** El inicio quedaría después del fin. */
  | "inverted"

export type PlanEditResult = { edit: PlanEdit } | { error: PlanEditError }

export interface PlanEditContext {
  element: ScheduleElement
  dependencies: ScheduleDependency[]
  dates: Map<string, ScheduledDates>
}

const UNIT_DAYS: Record<DurationUnit, number> = { days: 1, weeks: 7, months: 30.4375 }

// La cantidad entera que cumple `fits` en la unidad que había; si no, en
// semanas; y si no, en días. Nunca aparecen decimales que nadie ha escrito.
function express(
  days: number,
  preferred: DurationUnit | null,
  fits: (amount: number, unit: DurationUnit) => boolean
): Amount {
  const units = [...new Set([preferred ?? "days", "weeks", "days"] as DurationUnit[])]
  for (const unit of units) {
    const estimate = Math.round(days / UNIT_DAYS[unit])
    const amount = [estimate, estimate - 1, estimate + 1].find(
      (candidate) => candidate !== 0 && fits(candidate, unit)
    )
    if (amount !== undefined) return { amount, unit }
  }
  return { amount: days, unit: "days" }
}

const dependencyOn = (context: PlanEditContext, point: DatePoint) =>
  context.dependencies.find(
    (dependency) =>
      dependency.successorId === context.element.id && dependency.successorPoint === point
  )

const rewriteLag = (
  context: PlanEditContext,
  dependency: ScheduleDependency,
  target: EpochDay
): PlanEditResult => {
  const from = context.dates.get(dependency.predecessorId)?.[dependency.predecessorPoint]
  if (from == null) return { error: "missing-reference" }
  if (target === from) {
    return {
      edit: {
        kind: "lag",
        point: dependency.successorPoint,
        lag: { amount: 0, unit: dependency.lagUnit },
      },
    }
  }
  const lag = express(
    target - from,
    dependency.lagUnit,
    (amount, unit) => shiftDay(from, amount, unit) === target
  )
  return { edit: { kind: "lag", point: dependency.successorPoint, lag } }
}

/** Escribir a mano el inicio de un elemento. Ver docs/modelo/README.md, «Editar el plan». */
export function moveStart(context: PlanEditContext, target: EpochDay): PlanEditResult {
  const { element } = context
  if (element.isAnchor || element.isPinned) return { edit: { kind: "fixed-start", date: target } }

  const startDependency = dependencyOn(context, "start")
  if (startDependency) return rewriteLag(context, startDependency, target)

  if (dependencyOn(context, "end")) {
    const end = context.dates.get(element.id)?.end
    if (end == null) return { error: "missing-reference" }
    if (target > end) return { error: "inverted" }
    const duration = express(
      end - target + 1,
      element.durationUnit,
      (amount, unit) => amount > 0 && startFromEnd(end, amount, unit) === target
    )
    return { edit: { kind: "duration", duration } }
  }

  return { edit: { kind: "pin", date: target } }
}

/** Escribir a mano el fin de un elemento. */
export function moveEnd(context: PlanEditContext, target: EpochDay): PlanEditResult {
  const endDependency = dependencyOn(context, "end")
  if (endDependency) return rewriteLag(context, endDependency, target)

  const start = context.dates.get(context.element.id)?.start
  if (start == null) return { error: "missing-reference" }
  if (target < start) return { error: "inverted" }
  const duration = express(
    target - start + 1,
    context.element.durationUnit,
    (amount, unit) => amount > 0 && endFromStart(start, amount, unit) === target
  )
  return { edit: { kind: "duration", duration } }
}
