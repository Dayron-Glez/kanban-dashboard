import { CrewMemberSchema } from "@repo/contracts"
import * as z from "zod"
import type { CrewRepository } from "../ApiClient"
import type { HttpClient } from "./httpClient"

export const createCrewRepository = (http: HttpClient): CrewRepository => ({
  listByProject: (projectId) =>
    http.request("GET", `/projects/${projectId}/crew`, { schema: z.array(CrewMemberSchema) }),
  create: (projectId, input) =>
    http.request("POST", `/projects/${projectId}/crew`, {
      body: input,
      schema: CrewMemberSchema,
    }),
  update: (crewMemberId, input) =>
    http.request("PATCH", `/crew/${crewMemberId}`, { body: input, schema: CrewMemberSchema }),
  remove: (crewMemberId) => http.request("DELETE", `/crew/${crewMemberId}`),
})
