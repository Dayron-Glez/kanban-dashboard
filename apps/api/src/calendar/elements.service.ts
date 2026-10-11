import { ConflictException, Inject, Injectable } from "@nestjs/common"
import { CalendarElementSchema, type CalendarElement, type ProjectKind } from "@repo/contracts"
import { asc, count, eq } from "drizzle-orm"
import { DB, type Database } from "../db/db.module.js"
import { elements, projects } from "../db/schema/index.js"
import { ProjectAccess } from "../projects/project-access.js"
import { insertCalendarTemplate } from "./calendar-template.js"

const toElement = (row: typeof elements.$inferSelect): CalendarElement =>
  CalendarElementSchema.parse({
    id: row.id,
    projectId: row.projectId,
    kind: row.kind,
    parentId: row.parentId,
    position: row.position,
    name: row.name,
    color: row.color,
    templateKey: row.templateKey,
  })

@Injectable()
export class ElementsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(ProjectAccess) private readonly access: ProjectAccess
  ) {}

  async listByProject(userId: string, projectId: string): Promise<CalendarElement[]> {
    await this.access.requireMember(projectId, userId)
    const rows = await this.db
      .select()
      .from(elements)
      .where(eq(elements.projectId, projectId))
      .orderBy(asc(elements.position), asc(elements.id))
    return rows.map(toElement)
  }

  // Para los proyectos que nacieron sin calendario o lo han vaciado. El
  // bloqueo del proyecto evita que dos peticiones a la vez lo generen dos veces.
  async generateFromTemplate(userId: string, projectId: string): Promise<CalendarElement[]> {
    await this.access.requireOwner(projectId, userId)
    await this.db.transaction(async (tx) => {
      const [project] = await tx
        .select({ kind: projects.kind })
        .from(projects)
        .where(eq(projects.id, projectId))
        .for("update")
      const [existing] = await tx
        .select({ total: count() })
        .from(elements)
        .where(eq(elements.projectId, projectId))
      if (existing!.total > 0) {
        throw new ConflictException("El calendario del proyecto ya tiene elementos")
      }
      await insertCalendarTemplate(tx, projectId, project!.kind as ProjectKind)
    })
    return this.listByProject(userId, projectId)
  }
}
