import { DepartmentSchema } from "@repo/contracts"
import * as z from "zod"
import type { DepartmentsRepository } from "../ApiClient"
import type { HttpClient } from "./httpClient"

export const createDepartmentsRepository = (http: HttpClient): DepartmentsRepository => ({
  listByProject: (projectId) =>
    http.request("GET", `/projects/${projectId}/departments`, {
      schema: z.array(DepartmentSchema),
    }),
})
