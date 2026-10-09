import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common"
import {
  AssignedTaskSchema,
  TaskSchema,
  type AssignedTask,
  type Task,
  type TaskInput,
} from "@repo/contracts"
import { applyMove } from "@repo/domain"
import { and, count, eq, inArray, ne } from "drizzle-orm"
import { DB, type Database } from "../db/db.module.js"
import { columns, projectMembers, projects, taskHistory, tasks } from "../db/schema/index.js"
import { ProjectAccess } from "../projects/project-access.js"

const toTask = (row: typeof tasks.$inferSelect): Task =>
  TaskSchema.parse({
    id: row.id,
    projectId: row.projectId,
    columnId: row.columnId,
    content: row.content,
    priority: row.priority,
    size: row.size,
    dueDate: row.dueDate,
    position: row.position,
    assigneeId: row.assigneeId,
  })

// Una fecha vacía del formulario llega como "": se guarda como ausencia.
const toRow = (input: TaskInput) => ({
  content: input.content,
  priority: input.priority,
  size: input.size,
  dueDate: input.dueDate || null,
  assigneeId: input.assigneeId,
})

@Injectable()
export class TasksService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(ProjectAccess) private readonly access: ProjectAccess
  ) {}

  async listByProject(userId: string, projectId: string): Promise<Task[]> {
    await this.access.requireMember(projectId, userId)
    const rows = await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, projectId))
      .orderBy(tasks.position)
    return rows.map(toTask)
  }

  // Las pendientes del usuario en todos sus proyectos. El join con
  // project_members deja fuera las de proyectos de los que ya no es miembro.
  async listAssignedToMe(userId: string): Promise<AssignedTask[]> {
    const rows = await this.db
      .select({
        task: tasks,
        projectName: projects.name,
        projectColor: projects.color,
        columnTitle: columns.title,
      })
      .from(tasks)
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .innerJoin(columns, eq(columns.id, tasks.columnId))
      .innerJoin(
        projectMembers,
        and(eq(projectMembers.projectId, tasks.projectId), eq(projectMembers.userId, userId))
      )
      .where(and(eq(tasks.assigneeId, userId), ne(columns.category, "done")))
      .orderBy(tasks.position)

    return rows.map(({ task, ...context }) =>
      AssignedTaskSchema.parse({
        id: task.id,
        projectId: task.projectId,
        content: task.content,
        priority: task.priority,
        size: task.size,
        ...context,
      })
    )
  }

  // Se crea al final de su columna.
  async create(
    userId: string,
    projectId: string,
    { columnId, ...input }: TaskInput & { columnId: string }
  ): Promise<Task> {
    await this.access.requireMember(projectId, userId)
    await this.requireColumnOf(projectId, columnId)
    await this.requireAssignable(projectId, input.assigneeId)

    const [existing] = await this.db
      .select({ total: count() })
      .from(tasks)
      .where(eq(tasks.columnId, columnId))
    const [row] = await this.db
      .insert(tasks)
      .values({ ...toRow(input), projectId, columnId, position: existing?.total ?? 0 })
      .returning()
    return toTask(row!)
  }

  async update(userId: string, taskId: string, input: TaskInput): Promise<void> {
    const projectId = await this.requireMemberOf(taskId, userId)
    await this.requireAssignable(projectId, input.assigneeId)
    await this.db.update(tasks).set(toRow(input)).where(eq(tasks.id, taskId))
  }

  async remove(userId: string, taskId: string): Promise<void> {
    await this.requireMemberOf(taskId, userId)
    await this.db.delete(tasks).where(eq(tasks.id, taskId))
  }

  // Mueve la tarea y deja la columna de destino en el orden pedido, con
  // applyMove: la misma función con la que la web pinta el estado optimista,
  // así que lo guardado coincide con lo que ya se ve. Solo toca column_id y
  // position, y el historial entra en la misma transacción.
  async move(
    userId: string,
    taskId: string,
    { toColumnId, orderedTaskIds }: { toColumnId: string; orderedTaskIds: string[] }
  ): Promise<void> {
    const projectId = await this.requireMemberOf(taskId, userId)
    await this.requireColumnOf(projectId, toColumnId)

    await this.db.transaction(async (tx) => {
      const [task] = await tx
        .select({ columnId: tasks.columnId })
        .from(tasks)
        .where(eq(tasks.id, taskId))
        .for("update")
      if (!task) throw new NotFoundException("La tarea no existe")
      const fromColumnId = task.columnId

      const affected = await tx
        .select({ id: tasks.id, columnId: tasks.columnId, position: tasks.position })
        .from(tasks)
        .where(inArray(tasks.columnId, [fromColumnId, toColumnId]))
        .for("update")
      const before = new Map(affected.map((row) => [row.id, row]))

      for (const row of applyMove(affected, { taskId, toColumnId, orderedTaskIds })) {
        const previous = before.get(row.id)
        if (previous?.columnId === row.columnId && previous.position === row.position) continue
        await tx
          .update(tasks)
          .set({ columnId: row.columnId, position: row.position })
          .where(eq(tasks.id, row.id))
      }

      if (fromColumnId !== toColumnId) {
        await tx.insert(taskHistory).values({ taskId, fromColumnId, toColumnId })
      }
    })
  }

  private async requireMemberOf(taskId: string, userId: string): Promise<string> {
    const [task] = await this.db
      .select({ projectId: tasks.projectId })
      .from(tasks)
      .where(eq(tasks.id, taskId))
    if (!task) throw new NotFoundException("La tarea no existe")
    await this.access.requireMember(task.projectId, userId)
    return task.projectId
  }

  // La RLS solo miraba el proyecto de la tarea: se podía colgar de una columna
  // de otro proyecto.
  private async requireColumnOf(projectId: string, columnId: string): Promise<void> {
    const [column] = await this.db
      .select({ id: columns.id })
      .from(columns)
      .where(and(eq(columns.id, columnId), eq(columns.projectId, projectId)))
    if (!column) throw new BadRequestException("La columna no es de este proyecto")
  }

  // Ni la RLS ni la FK lo impedían: se podía asignar a cualquier usuario.
  private async requireAssignable(projectId: string, assigneeId: string | null): Promise<void> {
    if (!assigneeId) return
    const [member] = await this.db
      .select({ id: projectMembers.id })
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, assigneeId)))
    if (!member) throw new BadRequestException("La persona asignada no es miembro del proyecto")
  }
}
