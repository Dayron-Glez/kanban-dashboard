import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import type {
  CalendarPlan,
  DatePoint,
  SetElementRuleInput,
  UpdateElementPlanInput,
} from "@repo/contracts"
import { wouldCreateCycle } from "@repo/domain"
import { and, eq } from "drizzle-orm"
import { DB, type Database } from "../db/db.module.js"
import { elementDependencies, elements, projects } from "../db/schema/index.js"
import { ProjectAccess } from "../projects/project-access.js"
import type { Transaction } from "./calendar-template.js"
import { loadPlan, recalculatePlan } from "./plan.js"

type EditableElement = { projectId: string; isAnchor: boolean; isPinned: boolean }

@Injectable()
export class PlanService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(ProjectAccess) private readonly access: ProjectAccess
  ) {}

  async getPlan(userId: string, projectId: string): Promise<CalendarPlan> {
    await this.access.requireMember(projectId, userId)
    return loadPlan(this.db, projectId)
  }

  async updateElementPlan(
    userId: string,
    elementId: string,
    input: UpdateElementPlanInput
  ): Promise<CalendarPlan> {
    const element = await this.findEditable(userId, elementId)
    if (input.isPinned !== undefined && element.isAnchor) {
      throw new BadRequestException("El ancla no se fija: ya tiene su fecha escrita a mano")
    }
    if (input.isPinned && !input.fixedStart) {
      throw new BadRequestException("Para fijar un elemento hace falta su fecha")
    }
    const writesStart = element.isAnchor || element.isPinned || input.isPinned
    if (input.fixedStart !== undefined && !writesStart) {
      throw new BadRequestException(
        "Solo el ancla y los elementos fijados tienen una fecha escrita a mano"
      )
    }

    return this.edit(element.projectId, async (tx) => {
      await tx
        .update(elements)
        .set({
          ...(input.duration !== undefined && {
            durationAmount: input.duration?.amount ?? null,
            durationUnit: input.duration?.unit ?? null,
          }),
          ...(input.fixedStart !== undefined && { startsOn: input.fixedStart }),
          ...(input.isPinned !== undefined && { isPinned: input.isPinned }),
        })
        .where(eq(elements.id, elementId))
    })
  }

  // Sustituye la regla que hubiera en ese extremo.
  async setRule(
    userId: string,
    elementId: string,
    point: DatePoint,
    input: SetElementRuleInput
  ): Promise<CalendarPlan> {
    const element = await this.findEditable(userId, elementId)
    if (point === "start" && (element.isAnchor || element.isPinned)) {
      throw new BadRequestException("El inicio del ancla y de los fijados se escribe a mano")
    }

    return this.edit(element.projectId, async (tx) => {
      const [predecessor] = await tx
        .select({ id: elements.id })
        .from(elements)
        .where(and(eq(elements.id, input.predecessorId), eq(elements.projectId, element.projectId)))
      if (!predecessor) {
        throw new BadRequestException("El elemento del que depende no es de este proyecto")
      }

      const links = await tx
        .select({
          predecessorId: elementDependencies.predecessorId,
          successorId: elementDependencies.successorId,
        })
        .from(elementDependencies)
        .where(eq(elementDependencies.projectId, element.projectId))
      const cycle = wouldCreateCycle(links, {
        predecessorId: input.predecessorId,
        successorId: elementId,
      })
      if (cycle) {
        const names = await tx
          .select({ id: elements.id, name: elements.name })
          .from(elements)
          .where(eq(elements.projectId, element.projectId))
        const nameOf = new Map(names.map((row) => [row.id, row.name]))
        throw new ConflictException(
          `Esa regla cerraría un ciclo: ${cycle.map((id) => nameOf.get(id)).join(" → ")}`
        )
      }

      await this.deleteRule(tx, elementId, point)
      await tx.insert(elementDependencies).values({
        projectId: element.projectId,
        predecessorId: input.predecessorId,
        successorId: elementId,
        predecessorPoint: input.predecessorPoint,
        successorPoint: point,
        lagAmount: input.lag.amount,
        lagUnit: input.lag.unit,
      })
    })
  }

  async removeRule(userId: string, elementId: string, point: DatePoint): Promise<CalendarPlan> {
    const element = await this.findEditable(userId, elementId)
    return this.edit(element.projectId, (tx) => this.deleteRule(tx, elementId, point))
  }

  private async findEditable(userId: string, elementId: string): Promise<EditableElement> {
    const [element] = await this.db
      .select({
        projectId: elements.projectId,
        isAnchor: elements.isAnchor,
        isPinned: elements.isPinned,
      })
      .from(elements)
      .where(eq(elements.id, elementId))
    if (!element) throw new NotFoundException("El elemento no existe")
    await this.access.requireOwner(element.projectId, userId)
    return element
  }

  // Cada cambio recalcula el proyecto entero con el proyecto bloqueado: dos
  // ediciones a la vez no pueden dejar fechas calculadas con datos distintos.
  private edit(
    projectId: string,
    change: (tx: Transaction) => Promise<unknown>
  ): Promise<CalendarPlan> {
    return this.db.transaction(async (tx) => {
      await tx
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.id, projectId))
        .for("update")
      await change(tx)
      return recalculatePlan(tx, projectId)
    })
  }

  private deleteRule(tx: Transaction, elementId: string, point: DatePoint) {
    return tx
      .delete(elementDependencies)
      .where(
        and(
          eq(elementDependencies.successorId, elementId),
          eq(elementDependencies.successorPoint, point)
        )
      )
  }
}
