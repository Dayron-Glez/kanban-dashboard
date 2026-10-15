import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common"
import {
  CrewMemberSchema,
  type CreateCrewMemberInput,
  type CrewMember,
  type UpdateCrewMemberInput,
} from "@repo/contracts"
import { and, asc, eq } from "drizzle-orm"
import { DB, type Database } from "../db/db.module.js"
import { crewMembers, departments } from "../db/schema/index.js"
import { ProjectAccess } from "./project-access.js"

const toCrewMember = (row: typeof crewMembers.$inferSelect): CrewMember =>
  CrewMemberSchema.parse({
    id: row.id,
    projectId: row.projectId,
    fullName: row.fullName,
    email: row.email,
    departmentId: row.departmentId,
  })

@Injectable()
export class CrewService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(ProjectAccess) private readonly access: ProjectAccess
  ) {}

  async listByProject(userId: string, projectId: string): Promise<CrewMember[]> {
    await this.access.requireMember(projectId, userId)
    const rows = await this.db
      .select()
      .from(crewMembers)
      .where(eq(crewMembers.projectId, projectId))
      .orderBy(asc(crewMembers.fullName), asc(crewMembers.id))
    return rows.map(toCrewMember)
  }

  async create(
    userId: string,
    projectId: string,
    input: CreateCrewMemberInput
  ): Promise<CrewMember> {
    await this.access.requireOwner(projectId, userId)
    await this.checkDepartment(projectId, input.departmentId)
    const [row] = await this.db
      .insert(crewMembers)
      .values({
        projectId,
        fullName: input.fullName,
        email: input.email ?? null,
        departmentId: input.departmentId ?? null,
      })
      .returning()
    return toCrewMember(row!)
  }

  async update(
    userId: string,
    crewMemberId: string,
    input: UpdateCrewMemberInput
  ): Promise<CrewMember> {
    const projectId = await this.findProject(userId, crewMemberId)
    await this.checkDepartment(projectId, input.departmentId)
    const [row] = await this.db
      .update(crewMembers)
      .set(input)
      .where(eq(crewMembers.id, crewMemberId))
      .returning()
    return toCrewMember(row!)
  }

  async remove(userId: string, crewMemberId: string): Promise<void> {
    await this.findProject(userId, crewMemberId)
    await this.db.delete(crewMembers).where(eq(crewMembers.id, crewMemberId))
  }

  private async findProject(userId: string, crewMemberId: string): Promise<string> {
    const [member] = await this.db
      .select({ projectId: crewMembers.projectId })
      .from(crewMembers)
      .where(eq(crewMembers.id, crewMemberId))
    if (!member) throw new NotFoundException("La persona no existe")
    await this.access.requireOwner(member.projectId, userId)
    return member.projectId
  }

  private async checkDepartment(projectId: string, departmentId: string | null | undefined) {
    if (departmentId == null) return
    const [department] = await this.db
      .select({ id: departments.id })
      .from(departments)
      .where(and(eq(departments.id, departmentId), eq(departments.projectId, projectId)))
    if (!department) throw new BadRequestException("El departamento no es de este proyecto")
  }
}
