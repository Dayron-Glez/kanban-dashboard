import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import {
  ACTION_KINDS,
  ACTION_PARENT_KINDS,
  SINGLE_DAY_ACTION_KINDS,
  type ActionKind,
  type CalendarPlan,
  type CreateActionInput,
  type DatePoint,
  type EditElementInput,
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
import { DB, type Database, type Transaction } from "../db/db.module.js"
import { elementDependencies, elements, projects } from "../db/schema/index.js"
import { ProjectAccess } from "../projects/project-access.js"
import { loadPlan, recalculatePlan } from "./plan.js"

type EditableElement = {
  projectId: string
  kind: string
  parentId: string | null
  isAnchor: boolean
  isPinned: boolean
  durationAmount: number | null
  durationUnit: string | null
}
const isSingleDay = (kind: string) => SINGLE_DAY_ACTION_KINDS.includes(kind as ActionKind)
const isAction = (kind: string) => (ACTION_KINDS as readonly string[]).includes(kind)
const ONE_DAY = "Las reuniones y los recordatorios duran un solo día"

type EditContext = {
  elementId: string
  change: "plan" | "rule" | "removeRule" | "createAction" | "editElement" | "deleteAction"
  point?: DatePoint
}

// Lo que cambia en la fila del elemento por la duración y las fechas.
const planValues = (input: UpdateElementPlanInput) => ({
  ...(input.duration !== undefined && {
    durationAmount: input.duration?.amount ?? null,
    durationUnit: input.duration?.unit ?? null,
  }),
  ...(input.fixedStart !== undefined && { startsOn: input.fixedStart }),
  ...(input.isPinned !== undefined && { isPinned: input.isPinned }),
})

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
    this.checkPlan(element, input, element.kind)
    return this.edit(element.projectId, { elementId, change: "plan" }, (tx) =>
      tx.update(elements).set(planValues(input)).where(eq(elements.id, elementId))
    )
  }

  /**
   * Lo guardado de una vez desde el panel: nombre, tipo y padre de una acción,
   * duración y fechas, y las reglas de los dos extremos. Todo o nada, con un
   * solo recálculo y la misma comprobación del orden de las fases.
   */
  async editElement(
    userId: string,
    elementId: string,
    input: EditElementInput
  ): Promise<CalendarPlan> {
    const element = await this.findEditable(userId, elementId)
    if ((input.kind !== undefined || input.parentId !== undefined) && !isAction(element.kind)) {
      throw new BadRequestException("Solo las acciones cambian de tipo o de lo que cuelgan")
    }
    const kind = input.kind ?? element.kind
    this.checkPlan(element, input, kind)
    const pinned = input.isPinned ?? element.isPinned
    if (input.rules?.start && (element.isAnchor || pinned)) {
      throw new BadRequestException("El inicio del ancla y de los fijados se escribe a mano")
    }
    if (isSingleDay(kind)) {
      // Una reunión o un recordatorio acaba el día que empieza: su duración es de
      // un día y su fin no depende de nadie, también si lo es por el nuevo tipo.
      const amount = input.duration !== undefined ? input.duration?.amount : element.durationAmount
      const unit = input.duration !== undefined ? input.duration?.unit : element.durationUnit
      if (amount != null && (amount !== 1 || unit !== "days")) {
        throw new BadRequestException(ONE_DAY)
      }
      const endRule =
        input.rules?.end !== undefined ? input.rules.end : await this.findRule(elementId, "end")
      if (endRule) {
        throw new BadRequestException(
          "Las reuniones y los recordatorios duran un día: su fin no depende de otro elemento"
        )
      }
    }

    return this.edit(element.projectId, { elementId, change: "editElement" }, async (tx) => {
      let position: number | undefined
      if (input.parentId !== undefined && input.parentId !== element.parentId) {
        const [parent] = await tx
          .select({ kind: elements.kind })
          .from(elements)
          .where(and(eq(elements.id, input.parentId), eq(elements.projectId, element.projectId)))
        if (!parent || !ACTION_PARENT_KINDS.includes(parent.kind as ElementKind)) {
          throw new BadRequestException(
            "Una acción cuelga de una fase, una subfase o un proceso de este proyecto"
          )
        }
        const [last] = await tx
          .select({ position: max(elements.position) })
          .from(elements)
          .where(eq(elements.parentId, input.parentId))
        position = last?.position == null ? 0 : last.position + 1
      }
      const values = {
        ...planValues(input),
        ...(input.name !== undefined && { name: input.name }),
        ...(input.kind !== undefined && { kind: input.kind }),
        ...(position !== undefined && { parentId: input.parentId, position }),
      }
      if (Object.keys(values).length > 0) {
        await tx.update(elements).set(values).where(eq(elements.id, elementId))
      }
      for (const point of ["start", "end"] as const) {
        const rule = input.rules?.[point]
        if (rule === undefined) continue
        if (rule === null) await this.deleteRule(tx, elementId, point)
        else await this.writeRule(tx, element.projectId, elementId, point, rule)
      }
    })
  }

  /** De momento solo se borran acciones: borrar fases y procesos irá con su configuración. */
  async deleteAction(userId: string, elementId: string): Promise<CalendarPlan> {
    const element = await this.findEditable(userId, elementId)
    if (!isAction(element.kind)) {
      throw new BadRequestException("De momento solo se pueden borrar acciones")
    }
    return this.edit(element.projectId, { elementId, change: "deleteAction" }, (tx) =>
      tx.delete(elements).where(eq(elements.id, elementId))
    )
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
    if (point === "end" && isSingleDay(element.kind)) {
      throw new BadRequestException(
        "Las reuniones y los recordatorios duran un día: su fin no depende de otro elemento"
      )
    }

    return this.edit(element.projectId, { elementId, change: "rule", point }, (tx) =>
      this.writeRule(tx, element.projectId, elementId, point, input)
    )
  }

  async removeRule(userId: string, elementId: string, point: DatePoint): Promise<CalendarPlan> {
    const element = await this.findEditable(userId, elementId)
    return this.edit(element.projectId, { elementId, change: "removeRule", point }, (tx) =>
      this.deleteRule(tx, elementId, point)
    )
  }

  // Las comprobaciones de duración y fechas, comunes al plan y al panel.
  private checkPlan(element: EditableElement, input: UpdateElementPlanInput, kind: string) {
    if (input.isPinned !== undefined && element.isAnchor) {
      throw new BadRequestException("El ancla no se fija: ya tiene su fecha escrita a mano")
    }
    if (input.isPinned && !input.fixedStart) {
      throw new BadRequestException("Para fijar un elemento hace falta su fecha")
    }
    if (
      isSingleDay(kind) &&
      input.duration != null &&
      (input.duration.amount !== 1 || input.duration.unit !== "days")
    ) {
      throw new BadRequestException(ONE_DAY)
    }
    const writesStart = element.isAnchor || element.isPinned || input.isPinned
    if (input.fixedStart !== undefined && !writesStart) {
      throw new BadRequestException(
        "Solo el ancla y los elementos fijados tienen una fecha escrita a mano"
      )
    }
  }

  // Sustituye la regla de un extremo, sin dejar que cierre un ciclo.
  private async writeRule(
    tx: Transaction,
    projectId: string,
    elementId: string,
    point: DatePoint,
    input: SetElementRuleInput
  ) {
    const [predecessor] = await tx
      .select({ id: elements.id })
      .from(elements)
      .where(and(eq(elements.id, input.predecessorId), eq(elements.projectId, projectId)))
    if (!predecessor) {
      throw new BadRequestException("El elemento del que depende no es de este proyecto")
    }

    const links = await tx
      .select({
        predecessorId: elementDependencies.predecessorId,
        successorId: elementDependencies.successorId,
      })
      .from(elementDependencies)
      .where(eq(elementDependencies.projectId, projectId))
    const cycle = wouldCreateCycle(links, {
      predecessorId: input.predecessorId,
      successorId: elementId,
    })
    if (cycle) {
      const names = await tx
        .select({ id: elements.id, name: elements.name })
        .from(elements)
        .where(eq(elements.projectId, projectId))
      const nameOf = new Map(names.map((row) => [row.id, row.name]))
      this.logger.warn({ projectId, elementId, point, cycle }, "Regla rechazada: cerraría un ciclo")
      throw new ConflictException(
        `Esa regla cerraría un ciclo: ${cycle.map((id) => nameOf.get(id)).join(" → ")}`
      )
    }

    await this.deleteRule(tx, elementId, point)
    await tx.insert(elementDependencies).values({
      projectId,
      predecessorId: input.predecessorId,
      successorId: elementId,
      predecessorPoint: input.predecessorPoint,
      successorPoint: point,
      lagAmount: input.lag.amount,
      lagUnit: input.lag.unit,
    })
  }

  private async findRule(elementId: string, point: DatePoint) {
    const [rule] = await this.db
      .select({ id: elementDependencies.id })
      .from(elementDependencies)
      .where(
        and(
          eq(elementDependencies.successorId, elementId),
          eq(elementDependencies.successorPoint, point)
        )
      )
    return rule ?? null
  }

  private async findEditable(userId: string, elementId: string): Promise<EditableElement> {
    const [element] = await this.db
      .select({
        projectId: elements.projectId,
        kind: elements.kind,
        parentId: elements.parentId,
        isAnchor: elements.isAnchor,
        isPinned: elements.isPinned,
        durationAmount: elements.durationAmount,
        durationUnit: elements.durationUnit,
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
