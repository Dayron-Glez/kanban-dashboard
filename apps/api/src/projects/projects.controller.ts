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
  Put,
} from "@nestjs/common"
import {
  CreateProjectInputSchema,
  RenameProjectInputSchema,
  SetFavoriteInputSchema,
  type CreateProjectInput,
  type Project,
  type ProjectSummary,
  type RenameProjectInput,
  type SetFavoriteInput,
} from "@repo/contracts"
import { CurrentUser } from "../auth/current-user.decorator.js"
import type { AuthUser } from "../auth/token-verifier.js"
import { ProjectsService } from "./projects.service.js"

@Controller("projects")
export class ProjectsController {
  constructor(@Inject(ProjectsService) private readonly projects: ProjectsService) {}

  @Get()
  listMine(@CurrentUser() user: AuthUser): Promise<ProjectSummary[]> {
    return this.projects.listMine(user.id)
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body({ schema: CreateProjectInputSchema }) input: CreateProjectInput
  ): Promise<Project> {
    return this.projects.create(user.id, input)
  }

  @Patch(":projectId")
  @HttpCode(204)
  rename(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Body({ schema: RenameProjectInputSchema }) { name }: RenameProjectInput
  ): Promise<void> {
    return this.projects.rename(user.id, projectId, name)
  }

  @Delete(":projectId")
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string
  ): Promise<void> {
    return this.projects.remove(user.id, projectId)
  }

  @Put(":projectId/favorite")
  @HttpCode(204)
  setFavorite(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Body({ schema: SetFavoriteInputSchema }) { isFavorite }: SetFavoriteInput
  ): Promise<void> {
    return this.projects.setFavorite(user.id, projectId, isFavorite)
  }
}
