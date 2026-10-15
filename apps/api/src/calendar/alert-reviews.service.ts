import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common"
import { AlertConflictReviewSchema, type AlertConflictReview } from "@repo/contracts"
import { CONFLICT_KINDS } from "@repo/domain"
import { and, eq } from "drizzle-orm"
import { DB, type Database } from "../db/db.module.js"
import { alertConflictReviews, alerts, elements } from "../db/schema/index.js"
import { toIso } from "../db/timestamps.js"
import { ProjectAccess } from "../projects/project-access.js"

@Injectable()
export class AlertReviewsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(ProjectAccess) private readonly access: ProjectAccess
  ) {}

  async listByProject(userId: string, projectId: string): Promise<AlertConflictReview[]> {
    await this.access.requireMember(projectId, userId)
    const rows = await this.db
      .select({ review: alertConflictReviews })
      .from(alertConflictReviews)
      .innerJoin(alerts, eq(alerts.id, alertConflictReviews.alertId))
      .where(eq(alerts.projectId, projectId))
    return rows.map(({ review }) =>
      AlertConflictReviewSchema.parse({ ...review, reviewedAt: toIso(review.reviewedAt) })
    )
  }

  // Marcarlo dos veces no cambia quién lo asumió ni cuándo.
  async review(userId: string, alertId: string, elementId: string): Promise<void> {
    await this.findPair(userId, alertId, elementId)
    await this.db
      .insert(alertConflictReviews)
      .values({ alertId, elementId, reviewedBy: userId })
      .onConflictDoNothing()
  }

  async unreview(userId: string, alertId: string, elementId: string): Promise<void> {
    await this.findPair(userId, alertId, elementId)
    await this.db
      .delete(alertConflictReviews)
      .where(
        and(
          eq(alertConflictReviews.alertId, alertId),
          eq(alertConflictReviews.elementId, elementId)
        )
      )
  }

  private async findPair(userId: string, alertId: string, elementId: string): Promise<void> {
    const [[alert], [element]] = await Promise.all([
      this.db.select({ projectId: alerts.projectId }).from(alerts).where(eq(alerts.id, alertId)),
      this.db
        .select({ projectId: elements.projectId, kind: elements.kind })
        .from(elements)
        .where(eq(elements.id, elementId)),
    ])
    if (!alert) throw new NotFoundException("La alerta no existe")
    await this.access.requireOwner(alert.projectId, userId)
    if (element?.projectId !== alert.projectId) {
      throw new BadRequestException("La alerta y el elemento tienen que ser del mismo proyecto")
    }
    if (!CONFLICT_KINDS.some((kind) => kind === element.kind)) {
      throw new BadRequestException("Solo se asumen conflictos de acciones y procesos")
    }
  }
}
