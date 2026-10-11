import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common"
import type { CalendarPlan, UpdateElementPlanInput } from "@repo/contracts"
import { eq } from "drizzle-orm"
import { DB, type Database } from "../db/db.module.js"
import { elements, projects } from "../db/schema/index.js"
import { ProjectAccess } from "../projects/project-access.js"
import { loadPlan, recalculatePlan } from "./plan.js"

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

  // Cada cambio recalcula el proyecto entero con el proyecto bloqueado: dos
  // ediciones a la vez no pueden dejar fechas calculadas con datos distintos.
  async updateElementPlan(
    userId: string,
    elementId: string,
    input: UpdateElementPlanInput
  ): Promise<CalendarPlan> {
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
    if (input.fixedStart !== undefined && !element.isAnchor && !element.isPinned) {
      throw new BadRequestException(
        "Solo el ancla y los elementos fijados tienen una fecha escrita a mano"
      )
    }

    return this.db.transaction(async (tx) => {
      await tx
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.id, element.projectId))
        .for("update")
      await tx
        .update(elements)
        .set({
          ...(input.duration !== undefined && {
            durationAmount: input.duration?.amount ?? null,
            durationUnit: input.duration?.unit ?? null,
          }),
          ...(input.fixedStart !== undefined && { startsOn: input.fixedStart }),
        })
        .where(eq(elements.id, elementId))
      return recalculatePlan(tx, element.projectId)
    })
  }
}
