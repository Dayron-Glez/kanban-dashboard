import { Inject, Injectable } from "@nestjs/common"
import { DepartmentSchema, type Department } from "@repo/contracts"
import { asc, eq } from "drizzle-orm"
import { DB, type Database } from "../db/db.module.js"
import { departments } from "../db/schema/index.js"
import { ProjectAccess } from "./project-access.js"

@Injectable()
export class DepartmentsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(ProjectAccess) private readonly access: ProjectAccess
  ) {}

  async listByProject(userId: string, projectId: string): Promise<Department[]> {
    await this.access.requireMember(projectId, userId)
    const rows = await this.db
      .select()
      .from(departments)
      .where(eq(departments.projectId, projectId))
      .orderBy(asc(departments.position))
    return rows.map((row) => DepartmentSchema.parse(row))
  }
}
