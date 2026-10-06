import type {
  CreateInvitationInput,
  CreateProjectInput,
  Invitation,
  InvitationPreview,
  Project,
  ProjectMember,
  ProjectSummary,
} from "@repo/contracts"

export interface ProjectsRepository {
  listMine(): Promise<ProjectSummary[]>
  create(input: CreateProjectInput): Promise<Project>
  rename(id: string, name: string): Promise<void>
  remove(id: string): Promise<void>
  setFavorite(projectId: string, isFavorite: boolean): Promise<void>
}

export interface MembersRepository {
  listByProject(projectId: string): Promise<ProjectMember[]>
  remove(memberId: string): Promise<void>
}

export interface InvitationsRepository {
  listPending(projectId: string): Promise<Invitation[]>
  create(input: CreateInvitationInput): Promise<Invitation>
  cancel(id: string): Promise<void>
  /** null si el token no corresponde a ninguna invitación. */
  findByToken(token: string): Promise<InvitationPreview | null>
  /** Devuelve el id del proyecto al que da acceso. */
  accept(token: string): Promise<string>
}

export interface ApiClient {
  projects: ProjectsRepository
  members: MembersRepository
  invitations: InvitationsRepository
}
