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
  CreateColumnInputSchema,
  RenameColumnInputSchema,
  ReorderColumnsInputSchema,
  SetColumnCategoryInputSchema,
  type Column,
  type CreateColumnInput,
  type RenameColumnInput,
  type ReorderColumnsInput,
  type SetColumnCategoryInput,
} from "@repo/contracts"
import { CurrentUser } from "../auth/current-user.decorator.js"
import type { AuthUser } from "../auth/token-verifier.js"
import { ColumnsService } from "./columns.service.js"

// El proyecto va en la ruta, no en el cuerpo.
const CreateColumnBodySchema = CreateColumnInputSchema.omit({ projectId: true })

@Controller()
export class ColumnsController {
  constructor(@Inject(ColumnsService) private readonly columns: ColumnsService) {}

  @Get("projects/:projectId/columns")
  listByProject(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string
  ): Promise<Column[]> {
    return this.columns.listByProject(user.id, projectId)
  }

  @Post("projects/:projectId/columns")
  create(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Body({ schema: CreateColumnBodySchema }) input: Omit<CreateColumnInput, "projectId">
  ): Promise<Column> {
    return this.columns.create(user.id, projectId, input)
  }

  @Put("projects/:projectId/columns/order")
  @HttpCode(204)
  reorder(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Body({ schema: ReorderColumnsInputSchema }) { orderedColumnIds }: ReorderColumnsInput
  ): Promise<void> {
    return this.columns.reorder(user.id, projectId, orderedColumnIds)
  }

  @Patch("columns/:columnId")
  @HttpCode(204)
  rename(
    @CurrentUser() user: AuthUser,
    @Param("columnId", ParseUUIDPipe) columnId: string,
    @Body({ schema: RenameColumnInputSchema }) { title }: RenameColumnInput
  ): Promise<void> {
    return this.columns.rename(user.id, columnId, title)
  }

  @Delete("columns/:columnId")
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param("columnId", ParseUUIDPipe) columnId: string
  ): Promise<void> {
    return this.columns.remove(user.id, columnId)
  }

  @Put("columns/:columnId/category")
  @HttpCode(204)
  setCategory(
    @CurrentUser() user: AuthUser,
    @Param("columnId", ParseUUIDPipe) columnId: string,
    @Body({ schema: SetColumnCategoryInputSchema }) { category }: SetColumnCategoryInput
  ): Promise<void> {
    return this.columns.setCategory(user.id, columnId, category)
  }
}
