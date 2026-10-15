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
  setRule: (elementId, point, input) =>
    http.request("PUT", `/elements/${elementId}/rules/${point}`, {
      body: input,
      schema: CalendarPlanSchema,
    }),
  removeRule: (elementId, point) =>
    http.request("DELETE", `/elements/${elementId}/rules/${point}`, {
      schema: CalendarPlanSchema,
    }),
  createAction: (parentId, input) =>
    http.request("POST", `/elements/${parentId}/actions`, {
      body: input,
      schema: CalendarPlanSchema,
    }),
  editElement: (elementId, input) =>
    http.request("PATCH", `/elements/${elementId}/edits`, {
      body: input,
      schema: CalendarPlanSchema,
    }),
  deleteElement: (elementId) =>
    http.request("DELETE", `/elements/${elementId}`, { schema: CalendarPlanSchema }),
})
