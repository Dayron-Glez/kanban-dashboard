import type {
  AssignedTask,
  CalendarElement,
  CalendarPlan,
  CreateActionInput,
  CreateCrewMemberInput,
  CrewMember,
  Department,
  Column,
  ColumnCategory,
  CreateColumnInput,
  CreateInvitationInput,
  CreateProjectInput,
  CreateTaskInput,
  DatePoint,
  EditElementInput,
  Invitation,
  InvitationPreview,
  Project,
  ProjectMember,
  MoveTaskInput,
  ProjectSummary,
  SetElementRuleInput,
  Task,
  TaskHistoryEntry,
  TaskInput,
  UpdateCrewMemberInput,
  UpdateElementPlanInput,
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
  /** Si es «done», la que lo era pasa a «doing». */
  setCategory(id: string, category: ColumnCategory): Promise<void>
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

export interface ElementsRepository {
  /** El árbol del calendario, plano: cada elemento lleva el id de su padre. */
  listByProject(projectId: string): Promise<CalendarElement[]>
  /** Solo con el calendario vacío; devuelve el árbol creado. */
  generateFromTemplate(projectId: string): Promise<CalendarElement[]>
  /** Los elementos con sus fechas y las dependencias que las encadenan. */
  getPlan(projectId: string): Promise<CalendarPlan>
  /** Cambia la duración o la fecha escrita a mano; devuelve el plan recalculado. */
  updatePlan(elementId: string, input: UpdateElementPlanInput): Promise<CalendarPlan>
  /** Fija de qué depende un extremo, sustituyendo la regla que hubiera. */
  setRule(elementId: string, point: DatePoint, input: SetElementRuleInput): Promise<CalendarPlan>
  removeRule(elementId: string, point: DatePoint): Promise<CalendarPlan>
  /** Una acción nueva dentro de una fase, subfase o proceso; devuelve el plan. */
  createAction(parentId: string, input: CreateActionInput): Promise<CalendarPlan>
  /** Lo editado en el panel, de una vez: todo se guarda o nada. Devuelve el plan. */
  editElement(elementId: string, input: EditElementInput): Promise<CalendarPlan>
  /** Solo acciones: las fases, subfases y procesos no se borran. */
  deleteElement(elementId: string): Promise<CalendarPlan>
}

/** El equipo del proyecto: las personas, con o sin cuenta. */
export interface CrewRepository {
  listByProject(projectId: string): Promise<CrewMember[]>
  create(projectId: string, input: CreateCrewMemberInput): Promise<CrewMember>
  update(crewMemberId: string, input: UpdateCrewMemberInput): Promise<CrewMember>
  remove(crewMemberId: string): Promise<void>
}

export interface DepartmentsRepository {
  /** Los del proyecto, en su orden. */
  listByProject(projectId: string): Promise<Department[]>
}

export interface ApiClient {
  projects: ProjectsRepository
  members: MembersRepository
  invitations: InvitationsRepository
  columns: ColumnsRepository
  tasks: TasksRepository
  history: HistoryRepository
  elements: ElementsRepository
  crew: CrewRepository
  departments: DepartmentsRepository
}
