import {
  CalendarElementSchema,
  ElementDependencySchema,
  NO_PEOPLE,
  type CalendarPlan,
  type ElementPeople,
  type DatePoint,
  type DurationUnit,
} from "@repo/contracts"
import { computeSchedule, fromIsoDate, toIsoDate, type ScheduledDates } from "@repo/domain"
import { asc, eq } from "drizzle-orm"
import type { Database, Transaction } from "../db/db.module.js"
import {
  elementAssignees,
  elementDependencies,
  elementDepartments,
  elementGuests,
  elements,
} from "../db/schema/index.js"
import { toIso, toTime } from "../db/timestamps.js"

type ElementRow = typeof elements.$inferSelect
type DependencyRow = typeof elementDependencies.$inferSelect

// Quién interviene en cada elemento del proyecto: responsable, ejecutantes,
// departamentos y participantes, por id de elemento.
const readPeople = async (db: Database | Transaction, projectId: string) => {
  const ofProject = eq(elements.projectId, projectId)
  const [assignees, departments, guests] = await Promise.all([
    db
      .select({ row: elementAssignees })
      .from(elementAssignees)
      .innerJoin(elements, eq(elements.id, elementAssignees.elementId))
      .where(ofProject),
    db
      .select({ row: elementDepartments })
      .from(elementDepartments)
      .innerJoin(elements, eq(elements.id, elementDepartments.elementId))
      .where(ofProject),
    db
      .select({ row: elementGuests })
      .from(elementGuests)
      .innerJoin(elements, eq(elements.id, elementGuests.elementId))
      .where(ofProject)
      .orderBy(asc(elementGuests.position)),
  ])
  const people = new Map<string, ElementPeople>()
  const of = (elementId: string) => {
    const found = people.get(elementId) ?? {
      ...NO_PEOPLE,
      executorIds: [],
      departmentIds: [],
      guests: [],
    }
    people.set(elementId, found)
    return found
  }
  for (const { row } of assignees) {
    if (row.role === "responsible") of(row.elementId).responsibleId = row.crewMemberId
    else of(row.elementId).executorIds.push(row.crewMemberId)
  }
  for (const { row } of departments) of(row.elementId).departmentIds.push(row.departmentId)
  for (const { row } of guests) {
    of(row.elementId).guests.push({
      crewMemberId: row.crewMemberId,
      fullName: row.fullName,
      email: row.email,
    })
  }
  return people
}

const readRows = async (db: Database | Transaction, projectId: string) => {
  const [elementRows, dependencyRows, people] = await Promise.all([
    db
      .select()
      .from(elements)
      .where(eq(elements.projectId, projectId))
      .orderBy(asc(elements.position), asc(elements.id)),
    db.select().from(elementDependencies).where(eq(elementDependencies.projectId, projectId)),
    readPeople(db, projectId),
  ])
  return { elementRows, dependencyRows, people }
}

// El ancla y los fijados guardan en starts_on su fecha escrita a mano.
const schedule = (elementRows: ElementRow[], dependencyRows: DependencyRow[]) =>
  computeSchedule(
    elementRows.map((row) => ({
      id: row.id,
      durationAmount: row.durationAmount,
      durationUnit: row.durationUnit as DurationUnit | null,
      isAnchor: row.isAnchor,
      isPinned: row.isPinned,
      fixedStart: (row.isAnchor || row.isPinned) && row.startsOn ? fromIsoDate(row.startsOn) : null,
    })),
    dependencyRows.map((row) => ({
      predecessorId: row.predecessorId,
      successorId: row.successorId,
      predecessorPoint: row.predecessorPoint as DatePoint,
      successorPoint: row.successorPoint as DatePoint,
      lagAmount: row.lagAmount,
      lagUnit: row.lagUnit as DurationUnit,
    }))
  )

const isoOrNull = (day: number | null | undefined) => (day == null ? null : toIsoDate(day))

const toPlan = (
  elementRows: ElementRow[],
  dependencyRows: DependencyRow[],
  dates: Map<string, ScheduledDates>,
  people: Map<string, ElementPeople>
): CalendarPlan => ({
  elements: elementRows.map((row) =>
    CalendarElementSchema.parse({
      id: row.id,
      projectId: row.projectId,
      kind: row.kind,
      parentId: row.parentId,
      position: row.position,
      name: row.name,
      color: row.color,
      templateKey: row.templateKey,
      duration:
        row.durationAmount == null ? null : { amount: row.durationAmount, unit: row.durationUnit },
      startsOn: row.startsOn,
      endsOn: row.endsOn,
      isAnchor: row.isAnchor,
      isPinned: row.isPinned,
      issue: dates.get(row.id)?.issue ?? null,
      priority: row.priority,
      hours: {
        allDay: row.allDay,
        startTime: toTime(row.startTime),
        endTime: toTime(row.endTime),
        hoursMode: row.hoursMode,
      },
      location: row.location,
      notes: row.notes,
      completedAt: row.completedAt && toIso(row.completedAt),
      videoApp: row.videoApp,
      videoUrl: row.videoUrl,
      people: people.get(row.id) ?? NO_PEOPLE,
    })
  ),
  dependencies: dependencyRows.map((row) =>
    ElementDependencySchema.parse({
      id: row.id,
      predecessorId: row.predecessorId,
      successorId: row.successorId,
      predecessorPoint: row.predecessorPoint,
      successorPoint: row.successorPoint,
      lag: { amount: row.lagAmount, unit: row.lagUnit },
    })
  ),
})

/** El plan tal como está guardado, con el motivo de cada fecha que falta. */
export async function loadPlan(
  db: Database | Transaction,
  projectId: string
): Promise<CalendarPlan> {
  const { elementRows, dependencyRows, people } = await readRows(db, projectId)
  return toPlan(elementRows, dependencyRows, schedule(elementRows, dependencyRows), people)
}

/**
 * Recalcula las fechas del proyecto entero y guarda solo las que cambian.
 * Quien llama tiene el proyecto bloqueado en la misma transacción.
 */
export async function recalculatePlan(tx: Transaction, projectId: string): Promise<CalendarPlan> {
  const { elementRows, dependencyRows, people } = await readRows(tx, projectId)
  const dates = schedule(elementRows, dependencyRows)
  const updated: ElementRow[] = []
  for (const row of elementRows) {
    const computed = dates.get(row.id)
    const startsOn = isoOrNull(computed?.start)
    const endsOn = isoOrNull(computed?.end)
    if (startsOn !== row.startsOn || endsOn !== row.endsOn) {
      await tx.update(elements).set({ startsOn, endsOn }).where(eq(elements.id, row.id))
    }
    updated.push({ ...row, startsOn, endsOn })
  }
  return toPlan(updated, dependencyRows, dates, people)
}
