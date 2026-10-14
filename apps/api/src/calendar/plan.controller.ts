import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from "@nestjs/common"
import {
  CreateActionInputSchema,
  DATE_POINTS,
  SetElementRuleInputSchema,
  UpdateElementPlanInputSchema,
  type CalendarPlan,
  type CreateActionInput,
  type DatePoint,
  type SetElementRuleInput,
  type UpdateElementPlanInput,
} from "@repo/contracts"
import { CurrentUser } from "../auth/current-user.decorator.js"
import type { AuthUser } from "../auth/session.js"
import { PlanService } from "./plan.service.js"

const pointPipe = new ParseEnumPipe(Object.fromEntries(DATE_POINTS.map((point) => [point, point])))

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

  @Post("elements/:parentId/actions")
  createAction(
    @CurrentUser() user: AuthUser,
    @Param("parentId", ParseUUIDPipe) parentId: string,
    @Body({ schema: CreateActionInputSchema }) input: CreateActionInput
  ): Promise<CalendarPlan> {
    return this.plan.createAction(user.id, parentId, input)
  }

  @Put("elements/:elementId/rules/:point")
  setRule(
    @CurrentUser() user: AuthUser,
    @Param("elementId", ParseUUIDPipe) elementId: string,
    @Param("point", pointPipe) point: DatePoint,
    @Body({ schema: SetElementRuleInputSchema }) input: SetElementRuleInput
  ): Promise<CalendarPlan> {
    return this.plan.setRule(user.id, elementId, point, input)
  }

  @Delete("elements/:elementId/rules/:point")
  removeRule(
    @CurrentUser() user: AuthUser,
    @Param("elementId", ParseUUIDPipe) elementId: string,
    @Param("point", pointPipe) point: DatePoint
  ): Promise<CalendarPlan> {
    return this.plan.removeRule(user.id, elementId, point)
  }
}
