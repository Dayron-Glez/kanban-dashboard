import {
  CalendarElementSchema,
  ElementDependencySchema,
  type CalendarPlan,
  type DatePoint,
  type DurationUnit,
} from "@repo/contracts"
import { computeSchedule, fromIsoDate, toIsoDate, type ScheduledDates } from "@repo/domain"
import { asc, eq } from "drizzle-orm"
import type { Database, Transaction } from "../db/db.module.js"
import { elementDependencies, elements } from "../db/schema/index.js"

type ElementRow = typeof elements.$inferSelect
type DependencyRow = typeof elementDependencies.$inferSelect

const readRows = async (db: Database | Transaction, projectId: string) => {
  const [elementRows, dependencyRows] = await Promise.all([
    db
      .select()
      .from(elements)
      .where(eq(elements.projectId, projectId))
      .orderBy(asc(elements.position), asc(elements.id)),
    db.select().from(elementDependencies).where(eq(elementDependencies.projectId, projectId)),
  ])
  return { elementRows, dependencyRows }
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
  dates: Map<string, ScheduledDates>
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
  const { elementRows, dependencyRows } = await readRows(db, projectId)
  return toPlan(elementRows, dependencyRows, schedule(elementRows, dependencyRows))
}

/**
 * Recalcula las fechas del proyecto entero y guarda solo las que cambian.
 * Quien llama tiene el proyecto bloqueado en la misma transacción.
 */
export async function recalculatePlan(tx: Transaction, projectId: string): Promise<CalendarPlan> {
  const { elementRows, dependencyRows } = await readRows(tx, projectId)
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
  return toPlan(updated, dependencyRows, dates)
}
