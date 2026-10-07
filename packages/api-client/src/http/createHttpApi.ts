import type { ApiClient } from "../ApiClient"
import { createColumnsRepository } from "./columnsRepository"
import { createHistoryRepository } from "./historyRepository"
import type { HttpClient } from "./httpClient"
import { createInvitationsRepository } from "./invitationsRepository"
import { createMembersRepository } from "./membersRepository"
import { createProjectsRepository } from "./projectsRepository"
import { createTasksRepository } from "./tasksRepository"

export const createHttpApi = (http: HttpClient): ApiClient => ({
  projects: createProjectsRepository(http),
  members: createMembersRepository(http),
  invitations: createInvitationsRepository(http),
  columns: createColumnsRepository(http),
  tasks: createTasksRepository(http),
  history: createHistoryRepository(http),
})
