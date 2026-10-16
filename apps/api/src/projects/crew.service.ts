import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common"
import {
  CrewMemberSchema,
  type CreateCrewMemberInput,
  type CrewMember,
  type UpdateCrewMemberInput,
} from "@repo/contracts"
import { and, asc, eq } from "drizzle-orm"
import { DB, type Database, type Transaction } from "../db/db.module.js"
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
    return this.db.transaction(async (tx) => {
      await this.checkDepartment(tx, projectId, input.departmentId)
      const [row] = await tx
        .insert(crewMembers)
        .values({
          projectId,
          fullName: input.fullName,
          email: input.email ?? null,
          departmentId: input.departmentId ?? null,
        })
        .returning()
      return toCrewMember(row!)
    })
  }

  async update(
    userId: string,
    crewMemberId: string,
    input: UpdateCrewMemberInput
  ): Promise<CrewMember> {
    const projectId = await this.findProject(userId, crewMemberId)
    return this.db.transaction(async (tx) => {
      await this.checkDepartment(tx, projectId, input.departmentId)
      const [row] = await tx
        .update(crewMembers)
        .set(input)
        .where(eq(crewMembers.id, crewMemberId))
        .returning()
      if (!row) throw new NotFoundException("La persona no existe")
      return toCrewMember(row)
    })
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

  // Bloquea el departamento hasta el final de la transacción: no se borra a mitad.
  private async checkDepartment(
    tx: Transaction,
    projectId: string,
    departmentId: string | null | undefined
  ) {
    if (departmentId == null) return
    const [department] = await tx
      .select({ id: departments.id })
      .from(departments)
      .where(and(eq(departments.id, departmentId), eq(departments.projectId, projectId)))
      .for("key share")
    if (!department) throw new BadRequestException("El departamento no es de este proyecto")
  }
}
