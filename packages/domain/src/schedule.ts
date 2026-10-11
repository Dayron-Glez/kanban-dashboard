import type { DatePoint, DurationUnit } from "@repo/contracts"
import { endFromStart, shiftDay, startFromEnd, type EpochDay } from "./planDates.js"

export interface ScheduleElement {
  id: string
  durationAmount: number | null
  durationUnit: DurationUnit | null
  isAnchor: boolean
  isPinned: boolean
  /** El inicio escrito a mano: solo cuenta en el ancla y en los fijados. */
  fixedStart: EpochDay | null
}

export interface ScheduleDependency {
  predecessorId: string
  successorId: string
  predecessorPoint: DatePoint
  successorPoint: DatePoint
  lagAmount: number
  lagUnit: DurationUnit
}

export type ScheduleIssue =
  | { code: "missing-date" }
  | { code: "missing-duration" }
  | { code: "missing-dependency"; elementId: string }
  | { code: "unscheduled" }

export interface ScheduledDates {
  start: EpochDay | null
  end: EpochDay | null
  /** Por qué falta alguna fecha; null si tiene las dos. */
  issue: ScheduleIssue | null
}

export class ScheduleCycleError extends Error {
  readonly path: string[]

  constructor(path: string[]) {
    super(`Las dependencias forman un ciclo: ${path.join(" → ")}`)
    this.name = "ScheduleCycleError"
    this.path = path
  }
}

const durationOf = (element: ScheduleElement) =>
  element.durationAmount != null && element.durationAmount > 0 && element.durationUnit
    ? { amount: element.durationAmount, unit: element.durationUnit }
    : null

// Cada elemento después de aquellos de los que depende. Si hay un ciclo, lo
// devuelve recorrido, para poder decir qué elementos lo forman.
function topologicalOrder(ids: string[], dependencies: ScheduleDependency[]): string[] {
  const predecessors = new Map<string, string[]>(ids.map((id) => [id, []]))
  for (const dependency of dependencies) {
    predecessors.get(dependency.successorId)?.push(dependency.predecessorId)
  }
  const order: string[] = []
  const state = new Map<string, "visiting" | "done">()
  const visit = (id: string, path: string[]) => {
    if (state.get(id) === "done") return
    if (state.get(id) === "visiting") {
      // Se recorre hacia los predecesores: al revés se lee en el orden de las fechas.
      throw new ScheduleCycleError([...path.slice(path.indexOf(id)), id].reverse())
    }
    state.set(id, "visiting")
    for (const predecessor of predecessors.get(id) ?? []) visit(predecessor, [...path, id])
    state.set(id, "done")
    order.push(id)
  }
  for (const id of ids) visit(id, [])
  return order
}

/**
 * Las fechas de cada elemento a partir del ancla, los fijados, las duraciones y
 * las dependencias. Las convenciones están en docs/modelo/README.md, «Motor de
 * fechas». Lanza ScheduleCycleError si las dependencias forman un ciclo.
 */
export function computeSchedule(
  elements: ScheduleElement[],
  dependencies: ScheduleDependency[]
): Map<string, ScheduledDates> {
  const byId = new Map(elements.map((element) => [element.id, element]))
  const known = dependencies.filter(
    (dependency) => byId.has(dependency.predecessorId) && byId.has(dependency.successorId)
  )
  const fixing = new Map<string, Partial<Record<DatePoint, ScheduleDependency>>>()
  for (const dependency of known) {
    const points = fixing.get(dependency.successorId) ?? {}
    if (points[dependency.successorPoint]) {
      throw new Error(
        `Dos dependencias fijan el mismo extremo (${dependency.successorPoint}) de ${dependency.successorId}`
      )
    }
    points[dependency.successorPoint] = dependency
    fixing.set(dependency.successorId, points)
  }

  const result = new Map<string, ScheduledDates>()
  const resolve = (dependency: ScheduleDependency): EpochDay | null => {
    const from = result.get(dependency.predecessorId)?.[dependency.predecessorPoint] ?? null
    return from == null ? null : shiftDay(from, dependency.lagAmount, dependency.lagUnit)
  }

  for (const id of topologicalOrder([...byId.keys()], known)) {
    const element = byId.get(id)!
    const duration = durationOf(element)
    const set = (start: EpochDay | null, end: EpochDay | null, issue: ScheduleIssue | null) =>
      result.set(id, { start, end, issue })

    if (element.isAnchor || element.isPinned) {
      if (element.fixedStart == null) set(null, null, { code: "missing-date" })
      else if (!duration) set(element.fixedStart, null, { code: "missing-duration" })
      else
        set(
          element.fixedStart,
          endFromStart(element.fixedStart, duration.amount, duration.unit),
          null
        )
      continue
    }

    const { start: startDependency, end: endDependency } = fixing.get(id) ?? {}
    if (!startDependency && !endDependency) {
      set(null, null, { code: "unscheduled" })
      continue
    }
    const missing = [startDependency, endDependency].find(
      (dependency) => dependency && resolve(dependency) == null
    )
    if (missing) {
      set(null, null, { code: "missing-dependency", elementId: missing.predecessorId })
      continue
    }

    const start = startDependency ? resolve(startDependency) : null
    const end = endDependency ? resolve(endDependency) : null
    if (start != null && end != null) set(start, end, null)
    else if (!duration) set(start, end, { code: "missing-duration" })
    else if (start != null) set(start, endFromStart(start, duration.amount, duration.unit), null)
    else set(startFromEnd(end!, duration.amount, duration.unit), end, null)
  }
  return result
}
