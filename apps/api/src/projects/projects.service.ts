import { Inject, Injectable, NotFoundException } from "@nestjs/common"
import {
  DEFAULT_COLUMNS,
  ProjectSchema,
  ProjectSummarySchema,
  type CreateProjectInput,
  type Project,
  type ProjectSummary,
} from "@repo/contracts"
import { and, desc, eq, sql } from "drizzle-orm"
import { DB, type Database } from "../db/db.module.js"
import { columns, projectMembers, projects, tasks } from "../db/schema/index.js"
import { ProjectAccess } from "./project-access.js"
import { toIso } from "../db/timestamps.js"

const toProject = (row: typeof projects.$inferSelect): Project =>
  ProjectSchema.parse({
    id: row.id,
    ownerId: row.ownerId,
    name: row.name,
    description: row.description,
    color: row.color,
    createdAt: toIso(row.createdAt),
  })

@Injectable()
export class ProjectsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(ProjectAccess) private readonly access: ProjectAccess
  ) {}

  async listMine(userId: string): Promise<ProjectSummary[]> {
    const rows = await this.db
      .select({
        project: projects,
        role: projectMembers.role,
        isFavorite: projectMembers.isFavorite,
        taskCount: sql<number>`(select count(*)::int from ${tasks} where ${tasks.projectId} = ${projects.id})`,
      })
      .from(projectMembers)
      .innerJoin(projects, eq(projects.id, projectMembers.projectId))
      .where(eq(projectMembers.userId, userId))
      .orderBy(desc(projects.createdAt))

    return rows.map(({ project, ...membership }) =>
      ProjectSummarySchema.parse({ ...toProject(project), ...membership })
    )
  }

  // En una transacción: un proyecto no puede quedarse sin propietario ni columnas.
  create(userId: string, input: CreateProjectInput): Promise<Project> {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(projects)
        .values({
          ownerId: userId,
          name: input.name,
          // Un campo de formulario vacío llega como "": se guarda como ausencia.
          description: input.description || null,
          color: input.color,
        })
        .returning()
      const project = row!
      await tx.insert(projectMembers).values({ projectId: project.id, userId, role: "owner" })
      await tx.insert(columns).values(
        DEFAULT_COLUMNS.map((column, position) => ({
          ...column,
          projectId: project.id,
          position,
        }))
      )
      return toProject(project)
    })
  }

  async rename(userId: string, projectId: string, name: string): Promise<void> {
    await this.access.requireOwner(projectId, userId)
    await this.db.update(projects).set({ name }).where(eq(projects.id, projectId))
  }

  async remove(userId: string, projectId: string): Promise<void> {
    await this.access.requireOwner(projectId, userId)
    await this.db.delete(projects).where(eq(projects.id, projectId))
  }

  // Cada cual marca sus favoritos: se toca solo la fila de quien llama.
  async setFavorite(userId: string, projectId: string, isFavorite: boolean): Promise<void> {
    const updated = await this.db
      .update(projectMembers)
      .set({ isFavorite })
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
      .returning({ id: projectMembers.id })
    if (updated.length === 0) throw new NotFoundException("El proyecto no existe")
  }
}
