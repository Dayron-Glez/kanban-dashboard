import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from "@nestjs/common"
import {
  CreateAlertInputSchema,
  UpdateAlertInputSchema,
  type Alert,
  type CreateAlertInput,
  type UpdateAlertInput,
} from "@repo/contracts"
import { CurrentUser } from "../auth/current-user.decorator.js"
import type { AuthUser } from "../auth/session.js"
import { AlertsService } from "./alerts.service.js"

@Controller()
export class AlertsController {
  constructor(@Inject(AlertsService) private readonly alerts: AlertsService) {}

  @Get("projects/:projectId/alerts")
  listByProject(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string
  ): Promise<Alert[]> {
    return this.alerts.listByProject(user.id, projectId)
  }

  @Post("projects/:projectId/alerts")
  create(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Body({ schema: CreateAlertInputSchema }) input: CreateAlertInput
  ): Promise<Alert> {
    return this.alerts.create(user.id, projectId, input)
  }

  @Patch("alerts/:alertId")
  update(
    @CurrentUser() user: AuthUser,
    @Param("alertId", ParseUUIDPipe) alertId: string,
    @Body({ schema: UpdateAlertInputSchema }) input: UpdateAlertInput
  ): Promise<Alert> {
    return this.alerts.update(user.id, alertId, input)
  }

  @Delete("alerts/:alertId")
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param("alertId", ParseUUIDPipe) alertId: string
  ): Promise<void> {
    return this.alerts.remove(user.id, alertId)
  }
}
