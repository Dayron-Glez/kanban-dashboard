import {
  ACTION_KINDS,
  type Alert,
  type CrewMember,
  type ElementKind,
  type ElementPeople,
} from "@repo/contracts"
import { fromIsoDate, toIsoDate, type EpochDay } from "./planDates.js"

/** Una acción o un proceso que se cruza con una alerta, en los días de `from` a `to`. */
export interface AlertConflict {
  alertId: string
  elementId: string
  from: string
  /** Vacío si los dos siguen abiertos: una alerta sin fin y una contratación sin baja. */
  to: string | null
  /** Parcial si la alerta solo ocupa unas horas de alguno de esos días. */
  extent: "full" | "partial"
}

type ConflictElement = {
  id: string
  kind: ElementKind
  startsOn: string | null
  endsOn: string | null
  people?: ElementPeople
}

type ConflictAlert = Pick<Alert, "id" | "scope" | "when"> &
  Partial<Pick<Alert, "departmentIds" | "crewMemberIds">>

type ConflictCrew = Pick<CrewMember, "id" | "departmentId">

/** Los conflictos se marcan en acciones y procesos, nunca en fases ni subfases. */
export const CONFLICT_KINDS: readonly ElementKind[] = [...ACTION_KINDS, "process"]
const MIDNIGHT = "00:00"

const earliest = (a: EpochDay | null, b: EpochDay | null) =>
  a === null ? b : b === null ? a : Math.min(a, b)

// Sin fin, un elemento ocupa su día de inicio; la contratación sin baja sigue activa.
const elementEnd = (element: ConflictElement, start: EpochDay): EpochDay | null => {
  if (element.endsOn) return fromIsoDate(element.endsOn)
  return element.kind === "hiring" ? null : start
}

// Las personas del equipo que intervienen en un elemento, sin los invitados de fuera.
const crewOf = ({ people }: ConflictElement) =>
  people
    ? [
        ...(people.responsibleId ? [people.responsibleId] : []),
        ...people.executorIds,
        ...people.guests.flatMap((guest) => guest.crewMemberId ?? []),
      ]
    : []

/**
 * Una alerta de personas afecta a un elemento si alguna de ellas interviene en
 * él, o si interviene su departamento o alguien de él: sin una persona, su
 * departamento tampoco puede trabajar.
 */
const affects = (
  alert: ConflictAlert,
  element: ConflictElement,
  departmentOf: ReadonlyMap<string, string | null>
) => {
  if (alert.scope === "project") return true
  const crewIds = new Set(alert.crewMemberIds)
  const departmentIds = new Set([
    ...(alert.departmentIds ?? []),
    ...(alert.crewMemberIds ?? []).flatMap((id) => departmentOf.get(id) ?? []),
  ])
  return (
    crewOf(element).some(
      (id) => crewIds.has(id) || departmentIds.has(departmentOf.get(id) ?? "")
    ) || (element.people?.departmentIds ?? []).some((id) => departmentIds.has(id))
  )
}

/** Los días que ocupa una alerta y cuáles de ellos enteros. */
const alertDays = ({ when }: ConflictAlert) => {
  const start = fromIsoDate(when.startsOn)
  const end = when.endsOn === null ? null : fromIsoDate(when.endsOn)
  if (when.allDay) return { start, end, firstFull: start, lastFull: end }
  if (when.hoursMode !== "continuous") return { start, end, firstFull: null, lastFull: null }
  return {
    start,
    end: end !== null && when.endTime === MIDNIGHT ? end - 1 : end,
    firstFull: when.startTime === MIDNIGHT ? start : start + 1,
    lastFull: end === null ? null : end - 1,
  }
}

/**
 * Los conflictos de las alertas con las acciones y los
 * procesos. Sin horas, un elemento cuenta como de día entero. Las de personas
 * y departamentos, solo con los elementos en que intervienen; `crew` dice el
 * departamento de cada persona.
 */
export function findAlertConflicts(
  elements: readonly ConflictElement[],
  alerts: readonly ConflictAlert[],
  crew: readonly ConflictCrew[] = []
): AlertConflict[] {
  const candidates = elements.filter(
    (element) => element.startsOn !== null && CONFLICT_KINDS.includes(element.kind)
  )
  const departmentOf = new Map(crew.map((member) => [member.id, member.departmentId]))
  return alerts.flatMap((alert) => {
    const days = alertDays(alert)
    return candidates.flatMap((element): AlertConflict[] => {
      if (!affects(alert, element, departmentOf)) return []
      const start = fromIsoDate(element.startsOn!)
      const from = Math.max(start, days.start)
      const to = earliest(elementEnd(element, start), days.end)
      if (to !== null && to < from) return []
      const full =
        days.firstFull !== null &&
        from >= days.firstFull &&
        (days.lastFull === null || (to !== null && to <= days.lastFull))
      return [
        {
          alertId: alert.id,
          elementId: element.id,
          from: toIsoDate(from),
          to: to === null ? null : toIsoDate(to),
          extent: full ? "full" : "partial",
        },
      ]
    })
  })
}
