import { CalendarElementSchema, CalendarPlanSchema } from "@repo/contracts"
import * as z from "zod"
import type { ElementsRepository } from "../ApiClient"
import type { HttpClient } from "./httpClient"

export const createElementsRepository = (http: HttpClient): ElementsRepository => ({
  listByProject: (projectId) =>
    http.request("GET", `/projects/${projectId}/elements`, {
      schema: z.array(CalendarElementSchema),
    }),
  generateFromTemplate: (projectId) =>
    http.request("POST", `/projects/${projectId}/elements/template`, {
      schema: z.array(CalendarElementSchema),
    }),
  getPlan: (projectId) =>
    http.request("GET", `/projects/${projectId}/plan`, { schema: CalendarPlanSchema }),
  updatePlan: (elementId, input) =>
    http.request("PATCH", `/elements/${elementId}/plan`, {
      body: input,
      schema: CalendarPlanSchema,
    }),
})
