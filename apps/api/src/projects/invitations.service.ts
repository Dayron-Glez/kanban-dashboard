import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common"
import {
  InvitationPreviewSchema,
  InvitationSchema,
  type AcceptedInvitation,
  type Invitation,
  type InvitationPreview,
} from "@repo/contracts"
import { and, desc, eq } from "drizzle-orm"
import { authUsers } from "drizzle-orm/supabase"
import { DB, type Database } from "../db/db.module.js"
import { projectInvitations, projectMembers, projects } from "../db/generated/schema.js"
import { ProjectAccess } from "./project-access.js"
import { toIso } from "../db/timestamps.js"

const toInvitation = (row: typeof projectInvitations.$inferSelect): Invitation =>
  InvitationSchema.parse({
    id: row.id,
    projectId: row.projectId,
    email: row.email,
    token: row.token,
    status: row.status,
    expiresAt: toIso(row.expiresAt),
    createdAt: toIso(row.createdAt),
  })

@Injectable()
export class InvitationsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(ProjectAccess) private readonly access: ProjectAccess
  ) {}

  async listPending(userId: string, projectId: string): Promise<Invitation[]> {
    await this.access.requireMember(projectId, userId)
    const rows = await this.db
      .select()
      .from(projectInvitations)
      .where(
        and(eq(projectInvitations.projectId, projectId), eq(projectInvitations.status, "pending"))
      )
      .orderBy(desc(projectInvitations.createdAt))
    return rows.map(toInvitation)
  }

  // Token y caducidad (7 días) los pone la base por defecto.
  async create(userId: string, projectId: string, email: string): Promise<Invitation> {
    await this.access.requireOwner(projectId, userId)
    const [row] = await this.db.insert(projectInvitations).values({ projectId, email }).returning()
    return toInvitation(row!)
  }

  async cancel(userId: string, invitationId: string): Promise<void> {
    const [invitation] = await this.db
      .select({ projectId: projectInvitations.projectId })
      .from(projectInvitations)
      .where(eq(projectInvitations.id, invitationId))
    if (!invitation) throw new NotFoundException("La invitación no existe")
    await this.access.requireOwner(invitation.projectId, userId)
    await this.db.delete(projectInvitations).where(eq(projectInvitations.id, invitationId))
  }

  // Quien abre el enlace aún no es miembro: conocer el token es lo que le da
  // derecho a ver esta invitación, y solo esta. No se devuelve el token.
  async findByToken(token: string): Promise<InvitationPreview> {
    const [row] = await this.db
      .select({ invitation: projectInvitations, projectName: projects.name })
      .from(projectInvitations)
      .innerJoin(projects, eq(projects.id, projectInvitations.projectId))
      .where(eq(projectInvitations.token, token))
    if (!row) throw new NotFoundException("La invitación no existe")
    const { invitation, projectName } = row
    return InvitationPreviewSchema.parse({
      id: invitation.id,
      projectId: invitation.projectId,
      projectName,
      email: invitation.email,
      status: invitation.status,
      expiresAt: toIso(invitation.expiresAt),
    })
  }

  // La única vía para entrar en un proyecto ajeno, con las reglas de la RPC
  // accept_invitation: pendiente, sin caducar y dirigida al correo de quien la
  // acepta. El FOR UPDATE impide que dos aceptaciones simultáneas la usen dos veces.
  accept(userId: string, token: string): Promise<AcceptedInvitation> {
    return this.db.transaction(async (tx) => {
      const [invitation] = await tx
        .select()
        .from(projectInvitations)
        .where(eq(projectInvitations.token, token))
        .for("update")
      if (!invitation) throw new NotFoundException("La invitación no existe")

      const { projectId } = invitation
      if (invitation.status !== "pending") {
        // Reabrir el enlace ya usado no es un error si quien lo abre ya está dentro.
        const [membership] = await tx
          .select({ id: projectMembers.id })
          .from(projectMembers)
          .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
        if (membership) return { projectId }
        throw new NotFoundException("La invitación ya fue aceptada")
      }
      if (new Date(invitation.expiresAt) <= new Date()) {
        throw new NotFoundException("La invitación ha caducado")
      }

      const [user] = await tx
        .select({ email: authUsers.email })
        .from(authUsers)
        .where(eq(authUsers.id, userId))
      if (user?.email?.toLowerCase() !== invitation.email.toLowerCase()) {
        throw new ForbiddenException("La invitación está dirigida a otra dirección de correo")
      }

      // Siempre como «member»: el rol no lo elige quien acepta.
      await tx
        .insert(projectMembers)
        .values({ projectId, userId, role: "member" })
        .onConflictDoNothing({ target: [projectMembers.projectId, projectMembers.userId] })
      await tx
        .update(projectInvitations)
        .set({ status: "accepted" })
        .where(eq(projectInvitations.id, invitation.id))
      return { projectId }
    })
  }
}
