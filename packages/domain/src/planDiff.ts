import type { EpochDay } from "./planDates.js"
import type { ScheduledDates } from "./schedule.js"

export interface ScheduleDates {
  start: EpochDay | null
  end: EpochDay | null
}

export interface ScheduleChange {
  id: string
  before: ScheduleDates
  after: ScheduleDates
  /** Días que se mueve el inicio: positivo si se retrasa. Null si falta en alguno de los dos planes. */
  startShift: number | null
  endShift: number | null
  /** Empezaba dentro de su padre (o no tenía inicio) y con este cambio empieza fuera. */
  leavesParent: boolean
}

const shift = (from: EpochDay | null, to: EpochDay | null) =>
  from == null || to == null ? null : to - from

const startsWithin = (start: EpochDay | null, parent: ScheduleDates | undefined) =>
  start != null &&
  parent?.start != null &&
  start >= parent.start &&
  (parent.end == null || start <= parent.end)

/**
 * Lo que cambia entre dos planes, en el orden de `ids`: es lo que enseña la
 * alerta antes de guardar. Solo aparecen los elementos cuyo inicio o fin cambia.
 */
export function diffSchedules(
  ids: string[],
  before: Map<string, ScheduledDates>,
  after: Map<string, ScheduledDates>,
  parentOf: (id: string) => string | null
): ScheduleChange[] {
  const changes: ScheduleChange[] = []
  for (const id of ids) {
    const was = { start: before.get(id)?.start ?? null, end: before.get(id)?.end ?? null }
    const now = { start: after.get(id)?.start ?? null, end: after.get(id)?.end ?? null }
    if (was.start === now.start && was.end === now.end) continue

    const parentId = parentOf(id)
    const leavesParent =
      parentId != null &&
      now.start != null &&
      !startsWithin(now.start, after.get(parentId)) &&
      (was.start == null || startsWithin(was.start, before.get(parentId)))

    changes.push({
      id,
      before: was,
      after: now,
      startShift: shift(was.start, now.start),
      endShift: shift(was.end, now.end),
      leavesParent,
    })
  }
  return changes
}
