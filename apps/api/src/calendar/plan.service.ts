import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import {
  ACTION_PARENT_KINDS,
  type CalendarPlan,
  type CreateActionInput,
  type DatePoint,
  type ElementKind,
  type SetElementRuleInput,
  type UpdateElementPlanInput,
} from "@repo/contracts"
import {
  describePhaseViolation,
  fromIsoDate,
  phaseRuleViolations,
  phaseSpansOf,
  wouldCreateCycle,
} from "@repo/domain"
import { and, eq, max } from "drizzle-orm"
import { InjectPinoLogger, PinoLogger } from "nestjs-pino"
import { DB, type Database } from "../db/db.module.js"
import { elementDependencies, elements, projects } from "../db/schema/index.js"
import { ProjectAccess } from "../projects/project-access.js"
import type { Transaction } from "./calendar-template.js"
import { loadPlan, recalculatePlan } from "./plan.js"

type EditableElement = {
  projectId: string
  kind: string
  isAnchor: boolean
  isPinned: boolean
}
type EditContext = {
  elementId: string
  change: "plan" | "rule" | "removeRule" | "createAction"
  point?: DatePoint
}

@Injectable()
export class PlanService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(ProjectAccess) private readonly access: ProjectAccess,
    @InjectPinoLogger(PlanService.name) private readonly logger: PinoLogger
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

    return this.edit(element.projectId, { elementId, change: "plan" }, async (tx) => {
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

  // Una acción es un elemento fijado en su fecha, con su duración en días, al
  // final de lo que cuelga de su padre.
  async createAction(
    userId: string,
    parentId: string,
    input: CreateActionInput
  ): Promise<CalendarPlan> {
    const parent = await this.findEditable(userId, parentId)
    if (!ACTION_PARENT_KINDS.includes(parent.kind as ElementKind)) {
      throw new BadRequestException("Una acción cuelga de una fase, una subfase o un proceso")
    }
    const endsOn = input.endsOn ?? (input.kind === "hiring" ? null : input.startsOn)
    const days = endsOn == null ? null : fromIsoDate(endsOn) - fromIsoDate(input.startsOn) + 1

    return this.edit(
      parent.projectId,
      { elementId: parentId, change: "createAction" },
      async (tx) => {
        const [last] = await tx
          .select({ position: max(elements.position) })
          .from(elements)
          .where(eq(elements.parentId, parentId))
        await tx.insert(elements).values({
          projectId: parent.projectId,
          kind: input.kind,
          parentId,
          position: last?.position == null ? 0 : last.position + 1,
          name: input.name,
          durationAmount: days,
          durationUnit: days == null ? null : "days",
          startsOn: input.startsOn,
          isPinned: true,
        })
      }
    )
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

    return this.edit(element.projectId, { elementId, change: "rule", point }, async (tx) => {
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
        this.logger.warn(
          { projectId: element.projectId, elementId, point, cycle },
          "Regla rechazada: cerraría un ciclo"
        )
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
    return this.edit(element.projectId, { elementId, change: "removeRule", point }, (tx) =>
      this.deleteRule(tx, elementId, point)
    )
  }

  private async findEditable(userId: string, elementId: string): Promise<EditableElement> {
    const [element] = await this.db
      .select({
        projectId: elements.projectId,
        kind: elements.kind,
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
  // Si el resultado rompe el orden de las fases, se deshace entero.
  private async edit(
    projectId: string,
    context: EditContext,
    change: (tx: Transaction) => Promise<unknown>
  ): Promise<CalendarPlan> {
    const startedAt = performance.now()
    const plan = await this.db.transaction(async (tx) => {
      await tx
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.id, projectId))
        .for("update")
      await change(tx)
      const recalculated = await recalculatePlan(tx, projectId)
      const [violation] = phaseRuleViolations(phaseSpansOf(recalculated.elements))
      if (violation) {
        const nameOf = (id: string) =>
          recalculated.elements.find((element) => element.id === id)?.name ?? id
        this.logger.warn(
          { projectId, ...context, violation },
          "Cambio rechazado: rompe el orden de las fases"
        )
        throw new ConflictException(`No se puede: ${describePhaseViolation(violation, nameOf)}`)
      }
      return recalculated
    })
    this.logger.info(
      {
        projectId,
        ...context,
        elements: plan.elements.length,
        durationMs: Math.round(performance.now() - startedAt),
      },
      "Plan recalculado"
    )
    return plan
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
