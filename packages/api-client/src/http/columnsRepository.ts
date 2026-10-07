import { ColumnSchema } from "@repo/contracts"
import * as z from "zod"
import type { ColumnsRepository } from "../ApiClient"
import type { HttpClient } from "./httpClient"

export const createColumnsRepository = (http: HttpClient): ColumnsRepository => ({
  listByProject: (projectId) =>
    http.request("GET", `/projects/${projectId}/columns`, { schema: z.array(ColumnSchema) }),
  create: ({ projectId, ...body }) =>
    http.request("POST", `/projects/${projectId}/columns`, { body, schema: ColumnSchema }),
  rename: (id, title) => http.request("PATCH", `/columns/${id}`, { body: { title } }),
  remove: (id) => http.request("DELETE", `/columns/${id}`),
  reorder: (projectId, orderedColumnIds) =>
    http.request("PUT", `/projects/${projectId}/columns/order`, { body: { orderedColumnIds } }),
  setCategory: (id, category) =>
    http.request("PUT", `/columns/${id}/category`, { body: { category } }),
})
