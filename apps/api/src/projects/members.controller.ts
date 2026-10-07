import { Controller, Delete, Get, HttpCode, Inject, Param, ParseUUIDPipe } from "@nestjs/common"
import type { ProjectMember } from "@repo/contracts"
import { CurrentUser } from "../auth/current-user.decorator.js"
import type { AuthUser } from "../auth/token-verifier.js"
import { MembersService } from "./members.service.js"

@Controller()
export class MembersController {
  constructor(@Inject(MembersService) private readonly members: MembersService) {}

  @Get("projects/:projectId/members")
  listByProject(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string
  ): Promise<ProjectMember[]> {
    return this.members.listByProject(user.id, projectId)
  }

  @Delete("members/:memberId")
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param("memberId", ParseUUIDPipe) memberId: string
  ): Promise<void> {
    return this.members.remove(user.id, memberId)
  }
}
