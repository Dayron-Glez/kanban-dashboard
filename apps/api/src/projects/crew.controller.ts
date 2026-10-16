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
  CreateCrewMemberInputSchema,
  UpdateCrewMemberInputSchema,
  type CreateCrewMemberInput,
  type CrewMember,
  type UpdateCrewMemberInput,
} from "@repo/contracts"
import { CurrentUser } from "../auth/current-user.decorator.js"
import type { AuthUser } from "../auth/session.js"
import { CrewService } from "./crew.service.js"

@Controller()
export class CrewController {
  constructor(@Inject(CrewService) private readonly crew: CrewService) {}

  @Get("projects/:projectId/crew")
  listByProject(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string
  ): Promise<CrewMember[]> {
    return this.crew.listByProject(user.id, projectId)
  }

  @Post("projects/:projectId/crew")
  create(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Body({ schema: CreateCrewMemberInputSchema }) input: CreateCrewMemberInput
  ): Promise<CrewMember> {
    return this.crew.create(user.id, projectId, input)
  }

  @Patch("crew/:crewMemberId")
  update(
    @CurrentUser() user: AuthUser,
    @Param("crewMemberId", ParseUUIDPipe) crewMemberId: string,
    @Body({ schema: UpdateCrewMemberInputSchema }) input: UpdateCrewMemberInput
  ): Promise<CrewMember> {
    return this.crew.update(user.id, crewMemberId, input)
  }

  @Delete("crew/:crewMemberId")
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param("crewMemberId", ParseUUIDPipe) crewMemberId: string
  ): Promise<void> {
    return this.crew.remove(user.id, crewMemberId)
  }
}
