import { TaskHistoryEntrySchema } from "@repo/contracts"
import * as z from "zod"
import type { HistoryRepository } from "../ApiClient"
import type { HttpClient } from "./httpClient"

export const createHistoryRepository = (http: HttpClient): HistoryRepository => ({
  listByProject: (projectId) =>
    http.request("GET", `/projects/${projectId}/history`, {
      schema: z.array(TaskHistoryEntrySchema),
    }),
})
