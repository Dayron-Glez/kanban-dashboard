import { Controller, Get, Inject, Param, ParseUUIDPipe, Post } from "@nestjs/common"
import type { CalendarElement } from "@repo/contracts"
import { CurrentUser } from "../auth/current-user.decorator.js"
import type { AuthUser } from "../auth/session.js"
import { ElementsService } from "./elements.service.js"

@Controller("projects/:projectId/elements")
export class ElementsController {
  constructor(@Inject(ElementsService) private readonly elements: ElementsService) {}

  @Get()
  listByProject(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string
  ): Promise<CalendarElement[]> {
    return this.elements.listByProject(user.id, projectId)
  }

  @Post("template")
  generateFromTemplate(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string
  ): Promise<CalendarElement[]> {
    return this.elements.generateFromTemplate(user.id, projectId)
  }
}
