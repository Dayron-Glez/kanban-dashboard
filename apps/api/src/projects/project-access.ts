import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common"
import type { MemberRole } from "@repo/contracts"
import { and, eq } from "drizzle-orm"
import { DB, type Database } from "../db/db.module.js"
import { projectMembers } from "../db/schema/index.js"

// La API se conecta con un rol que se salta la RLS: estas comprobaciones son
// las que la sustituyen. A quien no es miembro se le responde 404 y no 403,
// para no confirmarle que el proyecto existe.
@Injectable()
export class ProjectAccess {
  constructor(@Inject(DB) private readonly db: Database) {}

  async requireMember(projectId: string, userId: string): Promise<MemberRole> {
    const [membership] = await this.db
      .select({ role: projectMembers.role })
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
    if (!membership) throw new NotFoundException("El proyecto no existe")
    return membership.role as MemberRole
  }

  async requireOwner(projectId: string, userId: string): Promise<void> {
    const role = await this.requireMember(projectId, userId)
    if (role !== "owner") {
      throw new ForbiddenException("Solo el propietario del proyecto puede hacer esto")
    }
  }
}
