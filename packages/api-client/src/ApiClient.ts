import type {
  AssignedTask,
  Column,
  CreateColumnInput,
  CreateInvitationInput,
  CreateProjectInput,
  CreateTaskInput,
  Invitation,
  InvitationPreview,
  Project,
  ProjectMember,
  MoveTaskInput,
  ProjectSummary,
  Task,
  TaskHistoryEntry,
  TaskInput,
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

export interface ColumnsRepository {
  listByProject(projectId: string): Promise<Column[]>
  /** Se crea al final del tablero. */
  create(input: CreateColumnInput): Promise<Column>
  rename(id: string, title: string): Promise<void>
  remove(id: string): Promise<void>
  reorder(projectId: string, orderedColumnIds: string[]): Promise<void>
}

export interface TasksRepository {
  listByProject(projectId: string): Promise<Task[]>
  /** Las del usuario autenticado en todos sus proyectos. */
  listAssignedToMe(): Promise<AssignedTask[]>
  /** Se crea al final de su columna. */
  create(input: CreateTaskInput): Promise<Task>
  update(id: string, input: TaskInput): Promise<void>
  remove(id: string): Promise<void>
  move(input: MoveTaskInput): Promise<void>
}

export interface HistoryRepository {
  /** Movimientos entre columnas, del más reciente al más antiguo. */
  listByProject(projectId: string): Promise<TaskHistoryEntry[]>
}

export interface ApiClient {
  projects: ProjectsRepository
  members: MembersRepository
  invitations: InvitationsRepository
  columns: ColumnsRepository
  tasks: TasksRepository
  history: HistoryRepository
}
