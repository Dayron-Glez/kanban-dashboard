import { ProjectSchema, ProjectSummarySchema } from "@repo/contracts"
import * as z from "zod"
import type { ProjectsRepository } from "../ApiClient"
import type { HttpClient } from "./httpClient"

export const createProjectsRepository = (http: HttpClient): ProjectsRepository => ({
  listMine: () => http.request("GET", "/projects", { schema: z.array(ProjectSummarySchema) }),
  create: (input) => http.request("POST", "/projects", { body: input, schema: ProjectSchema }),
  rename: (id, name) => http.request("PATCH", `/projects/${id}`, { body: { name } }),
  remove: (id) => http.request("DELETE", `/projects/${id}`),
  setFavorite: (projectId, isFavorite) =>
    http.request("PUT", `/projects/${projectId}/favorite`, { body: { isFavorite } }),
})
