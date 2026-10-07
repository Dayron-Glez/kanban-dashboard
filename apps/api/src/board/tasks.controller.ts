import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from "@nestjs/common"
import {
  CreateTaskInputSchema,
  MoveTaskInputSchema,
  TaskInputSchema,
  type AssignedTask,
  type CreateTaskInput,
  type MoveTaskInput,
  type Task,
  type TaskHistoryEntry,
  type TaskInput,
} from "@repo/contracts"
import { CurrentUser } from "../auth/current-user.decorator.js"
import type { AuthUser } from "../auth/token-verifier.js"
import { HistoryService } from "./history.service.js"
import { TasksService } from "./tasks.service.js"

// Lo que ya va en la ruta no se repite en el cuerpo.
const CreateTaskBodySchema = CreateTaskInputSchema.omit({ projectId: true })

@Controller()
export class TasksController {
  constructor(
    @Inject(TasksService) private readonly tasks: TasksService,
    @Inject(HistoryService) private readonly history: HistoryService
  ) {}

  @Get("projects/:projectId/tasks")
  listByProject(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string
  ): Promise<Task[]> {
    return this.tasks.listByProject(user.id, projectId)
  }

  @Get("projects/:projectId/history")
  listHistory(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string
  ): Promise<TaskHistoryEntry[]> {
    return this.history.listByProject(user.id, projectId)
  }

  @Get("me/tasks")
  listAssignedToMe(@CurrentUser() user: AuthUser): Promise<AssignedTask[]> {
    return this.tasks.listAssignedToMe(user.id)
  }

  @Post("projects/:projectId/tasks")
  create(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Body({ schema: CreateTaskBodySchema }) input: Omit<CreateTaskInput, "projectId">
  ): Promise<Task> {
    return this.tasks.create(user.id, projectId, input)
  }

  // PUT y no PATCH: llega la tarea editable entera, como la guarda el formulario.
  @Put("tasks/:taskId")
  @HttpCode(204)
  update(
    @CurrentUser() user: AuthUser,
    @Param("taskId", ParseUUIDPipe) taskId: string,
    @Body({ schema: TaskInputSchema }) input: TaskInput
  ): Promise<void> {
    return this.tasks.update(user.id, taskId, input)
  }

  @Delete("tasks/:taskId")
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param("taskId", ParseUUIDPipe) taskId: string
  ): Promise<void> {
    return this.tasks.remove(user.id, taskId)
  }

  @Post("tasks/:taskId/move")
  @HttpCode(204)
  move(
    @CurrentUser() user: AuthUser,
    @Param("taskId", ParseUUIDPipe) taskId: string,
    @Body({ schema: MoveTaskInputSchema.omit({ taskId: true }) })
    input: Omit<MoveTaskInput, "taskId">
  ): Promise<void> {
    return this.tasks.move(user.id, taskId, input)
  }
}
