import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common"
import { ProjectMemberSchema, type ProjectMember } from "@repo/contracts"
import { eq } from "drizzle-orm"
import { DB, type Database } from "../db/db.module.js"
import { projectMembers, users } from "../db/schema/index.js"
import { ProjectAccess } from "./project-access.js"
import { toIso } from "../db/timestamps.js"

@Injectable()
export class MembersService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(ProjectAccess) private readonly access: ProjectAccess
  ) {}

  async listByProject(userId: string, projectId: string): Promise<ProjectMember[]> {
    await this.access.requireMember(projectId, userId)
    const rows = await this.db
      .select({ member: projectMembers, user: users })
      .from(projectMembers)
      .innerJoin(users, eq(users.id, projectMembers.userId))
      .where(eq(projectMembers.projectId, projectId))
      .orderBy(projectMembers.joinedAt)

    return rows.map(({ member, user }) =>
      ProjectMemberSchema.parse({
        id: member.id,
        projectId: member.projectId,
        userId: member.userId,
        role: member.role,
        joinedAt: toIso(member.joinedAt),
        profile: { id: user.id, fullName: user.name, email: user.email, avatarUrl: user.image },
      })
    )
  }

  async remove(userId: string, memberId: string): Promise<void> {
    const [member] = await this.db
      .select({ projectId: projectMembers.projectId, role: projectMembers.role })
      .from(projectMembers)
      .where(eq(projectMembers.id, memberId))
    if (!member) throw new NotFoundException("El miembro no existe")
    await this.access.requireOwner(member.projectId, userId)
    // La RLS lo permitía, y dejaba el proyecto sin propietario.
    if (member.role === "owner") {
      throw new ForbiddenException("No se puede quitar al propietario del proyecto")
    }
    await this.db.delete(projectMembers).where(eq(projectMembers.id, memberId))
  }
}
