import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch } from "@nestjs/common"
import {
  UpdateElementPlanInputSchema,
  type CalendarPlan,
  type UpdateElementPlanInput,
} from "@repo/contracts"
import { CurrentUser } from "../auth/current-user.decorator.js"
import type { AuthUser } from "../auth/session.js"
import { PlanService } from "./plan.service.js"

@Controller()
export class PlanController {
  constructor(@Inject(PlanService) private readonly plan: PlanService) {}

  @Get("projects/:projectId/plan")
  getPlan(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string
  ): Promise<CalendarPlan> {
    return this.plan.getPlan(user.id, projectId)
  }

  @Patch("elements/:elementId/plan")
  updateElementPlan(
    @CurrentUser() user: AuthUser,
    @Param("elementId", ParseUUIDPipe) elementId: string,
    @Body({ schema: UpdateElementPlanInputSchema }) input: UpdateElementPlanInput
  ): Promise<CalendarPlan> {
    return this.plan.updateElementPlan(user.id, elementId, input)
  }
}
