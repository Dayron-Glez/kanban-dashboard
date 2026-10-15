import { Controller, Get, Inject, Param, ParseUUIDPipe } from "@nestjs/common"
import type { Department } from "@repo/contracts"
import { CurrentUser } from "../auth/current-user.decorator.js"
import type { AuthUser } from "../auth/session.js"
import { DepartmentsService } from "./departments.service.js"

@Controller("projects/:projectId/departments")
export class DepartmentsController {
  constructor(@Inject(DepartmentsService) private readonly departments: DepartmentsService) {}

  @Get()
  listByProject(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string
  ): Promise<Department[]> {
    return this.departments.listByProject(user.id, projectId)
  }
}
