import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common"
import {
  AlertSchema,
  type Alert,
  type CreateAlertInput,
  type OpenWhen,
  type UpdateAlertInput,
} from "@repo/contracts"
import { and, asc, eq, inArray, sql } from "drizzle-orm"
import { DB, type Database, type Transaction } from "../db/db.module.js"
import { alerts, alertTargets, crewMembers, departments } from "../db/schema/index.js"
import { toIso } from "../db/timestamps.js"
import { ProjectAccess } from "../projects/project-access.js"

type AlertRow = typeof alerts.$inferSelect
type TargetRow = typeof alertTargets.$inferSelect
type Targets = { departmentIds: string[]; crewMemberIds: string[] }

// Postgres devuelve las horas con segundos («09:00:00»); los contratos, HH:MM.
const toTime = (time: string | null) => time?.slice(0, 5) ?? null

const toAlert = (row: AlertRow, targets: TargetRow[]): Alert =>
  AlertSchema.parse({
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    cause: row.cause,
    certainty: row.certainty,
    scope: row.scope,
    departmentIds: targets.flatMap((target) => target.departmentId ?? []),
    crewMemberIds: targets.flatMap((target) => target.crewMemberId ?? []),
    when: {
      startsOn: row.startsOn,
      endsOn: row.endsOn,
      allDay: row.allDay,
      startTime: toTime(row.startTime),
      endTime: toTime(row.endTime),
      hoursMode: row.hoursMode,
    },
    notes: row.notes,
    createdBy: row.createdBy,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  })

const whenValues = (when: OpenWhen) => ({
  startsOn: when.startsOn,
  endsOn: when.endsOn,
  allDay: when.allDay,
  startTime: when.startTime,
  endTime: when.endTime,
  hoursMode: when.hoursMode,
})

@Injectable()
export class AlertsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(ProjectAccess) private readonly access: ProjectAccess
  ) {}

  async listByProject(userId: string, projectId: string): Promise<Alert[]> {
    await this.access.requireMember(projectId, userId)
    const rows = await this.db
      .select()
      .from(alerts)
      .where(eq(alerts.projectId, projectId))
      .orderBy(asc(alerts.startsOn), asc(alerts.id))
    const targets = rows.length
      ? await this.db
          .select()
          .from(alertTargets)
          .where(
            inArray(
              alertTargets.alertId,
              rows.map((row) => row.id)
            )
          )
      : []
    return rows.map((row) =>
      toAlert(
        row,
        targets.filter((target) => target.alertId === row.id)
      )
    )
  }

  async create(userId: string, projectId: string, input: CreateAlertInput): Promise<Alert> {
    await this.access.requireOwner(projectId, userId)
    return this.db.transaction(async (tx) => {
      await this.checkTargets(tx, projectId, input)
      const [row] = await tx
        .insert(alerts)
        .values({
          projectId,
          title: input.title,
          cause: input.cause,
          certainty: input.certainty,
          scope: input.scope,
          ...whenValues(input.when),
          notes: input.notes || null,
          createdBy: userId,
        })
        .returning()
      return toAlert(row!, await this.insertTargets(tx, row!.id, input))
    })
  }

  // Con el alcance llegan sus destinos: se sustituyen enteros.
  async update(userId: string, alertId: string, input: UpdateAlertInput): Promise<Alert> {
    const projectId = await this.findProject(userId, alertId)
    const { scope, departmentIds = [], crewMemberIds = [], when, notes, ...fields } = input
    return this.db.transaction(async (tx) => {
      if (scope !== undefined) {
        await this.checkTargets(tx, projectId, { departmentIds, crewMemberIds })
      }
      const [row] = await tx
        .update(alerts)
        .set({
          ...fields,
          ...(scope !== undefined && { scope }),
          ...(when !== undefined && whenValues(when)),
          ...(notes !== undefined && { notes: notes || null }),
          updatedAt: sql`now()`,
        })
        .where(eq(alerts.id, alertId))
        .returning()
      if (!row) throw new NotFoundException("La alerta no existe")
      if (scope !== undefined) {
        await tx.delete(alertTargets).where(eq(alertTargets.alertId, alertId))
        await this.insertTargets(tx, alertId, { departmentIds, crewMemberIds })
      }
      const targets = await tx.select().from(alertTargets).where(eq(alertTargets.alertId, alertId))
      return toAlert(row, targets)
    })
  }

  async remove(userId: string, alertId: string): Promise<void> {
    await this.findProject(userId, alertId)
    await this.db.delete(alerts).where(eq(alerts.id, alertId))
  }

  private async findProject(userId: string, alertId: string): Promise<string> {
    const [alert] = await this.db
      .select({ projectId: alerts.projectId })
      .from(alerts)
      .where(eq(alerts.id, alertId))
    if (!alert) throw new NotFoundException("La alerta no existe")
    await this.access.requireOwner(alert.projectId, userId)
    return alert.projectId
  }

  // Bloquea los destinos hasta el final de la transacción: no se borran a mitad.
  private async checkTargets(
    tx: Transaction,
    projectId: string,
    { departmentIds, crewMemberIds }: Targets
  ) {
    const [ownDepartments, ownCrew] = await Promise.all([
      departmentIds.length
        ? tx
            .select({ id: departments.id })
            .from(departments)
            .where(
              and(eq(departments.projectId, projectId), inArray(departments.id, departmentIds))
            )
            .for("key share")
        : [],
      crewMemberIds.length
        ? tx
            .select({ id: crewMembers.id })
            .from(crewMembers)
            .where(
              and(eq(crewMembers.projectId, projectId), inArray(crewMembers.id, crewMemberIds))
            )
            .for("key share")
        : [],
    ])
    if (ownDepartments.length !== departmentIds.length || ownCrew.length !== crewMemberIds.length) {
      throw new BadRequestException(
        "Una alerta solo afecta a departamentos y personas de su proyecto"
      )
    }
  }

  private async insertTargets(tx: Transaction, alertId: string, targets: Targets) {
    const rows = [
      ...targets.departmentIds.map((departmentId) => ({ alertId, departmentId })),
      ...targets.crewMemberIds.map((crewMemberId) => ({ alertId, crewMemberId })),
    ]
    return rows.length ? tx.insert(alertTargets).values(rows).returning() : []
  }
}
