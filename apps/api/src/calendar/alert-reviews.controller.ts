import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Put,
} from "@nestjs/common"
import type { AlertConflictReview } from "@repo/contracts"
import { CurrentUser } from "../auth/current-user.decorator.js"
import type { AuthUser } from "../auth/session.js"
import { AlertReviewsService } from "./alert-reviews.service.js"

@Controller()
export class AlertReviewsController {
  constructor(@Inject(AlertReviewsService) private readonly reviews: AlertReviewsService) {}

  @Get("projects/:projectId/alert-reviews")
  listByProject(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string
  ): Promise<AlertConflictReview[]> {
    return this.reviews.listByProject(user.id, projectId)
  }

  @Put("alerts/:alertId/reviews/:elementId")
  @HttpCode(204)
  review(
    @CurrentUser() user: AuthUser,
    @Param("alertId", ParseUUIDPipe) alertId: string,
    @Param("elementId", ParseUUIDPipe) elementId: string
  ): Promise<void> {
    return this.reviews.review(user.id, alertId, elementId)
  }

  @Delete("alerts/:alertId/reviews/:elementId")
  @HttpCode(204)
  unreview(
    @CurrentUser() user: AuthUser,
    @Param("alertId", ParseUUIDPipe) alertId: string,
    @Param("elementId", ParseUUIDPipe) elementId: string
  ): Promise<void> {
    return this.reviews.unreview(user.id, alertId, elementId)
  }
}
