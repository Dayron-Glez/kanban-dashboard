import { ProjectMemberSchema } from "@repo/contracts"
import * as z from "zod"
import type { MembersRepository } from "../ApiClient"
import type { HttpClient } from "./httpClient"

export const createMembersRepository = (http: HttpClient): MembersRepository => ({
  listByProject: (projectId) =>
    http.request("GET", `/projects/${projectId}/members`, {
      schema: z.array(ProjectMemberSchema),
    }),
  remove: (memberId) => http.request("DELETE", `/members/${memberId}`),
})
