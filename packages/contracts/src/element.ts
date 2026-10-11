import * as z from "zod"
import { ElementKindSchema } from "./enums.js"

/** Una fase, subfase, proceso o acción del calendario de un proyecto. */
export const CalendarElementSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  kind: ElementKindSchema,
  parentId: z.uuid().nullable(),
  position: z.number().int().nonnegative(),
  name: z.string(),
  color: z.string().nullable(),
  templateKey: z.string().nullable(),
})
export type CalendarElement = z.infer<typeof CalendarElementSchema>
