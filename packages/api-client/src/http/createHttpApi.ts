import type { ApiClient } from "../ApiClient"
import type { HttpClient } from "./httpClient"
import { createInvitationsRepository } from "./invitationsRepository"
import { createMembersRepository } from "./membersRepository"
import { createProjectsRepository } from "./projectsRepository"

/** Los repositorios que ya sirve la API propia. El resto llega en el 4.1. */
export type HttpApi = Pick<ApiClient, "projects" | "members" | "invitations">

export const createHttpApi = (http: HttpClient): HttpApi => ({
  projects: createProjectsRepository(http),
  members: createMembersRepository(http),
  invitations: createInvitationsRepository(http),
})
