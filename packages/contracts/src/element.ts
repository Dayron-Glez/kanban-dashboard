import * as z from "zod"
import {
  ActionKindSchema,
  DatePointSchema,
  DurationUnitSchema,
  ElementKindSchema,
  SINGLE_DAY_ACTION_KINDS,
} from "./enums.js"

/** Por qué a un elemento le falta alguna fecha. */
export const ScheduleIssueSchema = z.discriminatedUnion("code", [
  z.object({ code: z.literal("missing-date") }),
  z.object({ code: z.literal("missing-duration") }),
  z.object({ code: z.literal("missing-dependency"), elementId: z.uuid() }),
  z.object({ code: z.literal("unscheduled") }),
])
export type ScheduleIssue = z.infer<typeof ScheduleIssueSchema>

export const DurationSchema = z.object({
  amount: z.number().positive(),
  unit: DurationUnitSchema,
})
export type Duration = z.infer<typeof DurationSchema>

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
  duration: DurationSchema.nullable(),
  startsOn: z.iso.date().nullable(),
  endsOn: z.iso.date().nullable(),
  isAnchor: z.boolean(),
  isPinned: z.boolean(),
  issue: ScheduleIssueSchema.nullable(),
})
export type CalendarElement = z.infer<typeof CalendarElementSchema>

/** Fija el inicio o el fin de un elemento a partir de otro, con un desfase literal. */
export const ElementDependencySchema = z.object({
  id: z.uuid(),
  predecessorId: z.uuid(),
  successorId: z.uuid(),
  predecessorPoint: DatePointSchema,
  successorPoint: DatePointSchema,
  lag: z.object({ amount: z.number(), unit: DurationUnitSchema }),
})
export type ElementDependency = z.infer<typeof ElementDependencySchema>

export const CalendarPlanSchema = z.object({
  elements: z.array(CalendarElementSchema),
  dependencies: z.array(ElementDependencySchema),
})
export type CalendarPlan = z.infer<typeof CalendarPlanSchema>

/**
 * Lo que se edita del plan de un elemento. La fecha, solo en el ancla y los
 * fijados; `isPinned` fija con esa fecha un elemento que no depende de nada.
 */
export const UpdateElementPlanInputSchema = z.object({
  duration: DurationSchema.nullable().optional(),
  fixedStart: z.iso.date().nullable().optional(),
  isPinned: z.boolean().optional(),
})
export type UpdateElementPlanInput = z.infer<typeof UpdateElementPlanInputSchema>

/**
 * Una acción nueva en un día o un periodo. Sin fin, dura un día; una contratación
 * sin fin es una baja que aún no se conoce. Reuniones y recordatorios, un solo día.
 */
export const CreateActionInputSchema = z
  .object({
    kind: ActionKindSchema,
    name: z.string().trim().min(1).max(200),
    startsOn: z.iso.date(),
    endsOn: z.iso.date().nullable().optional(),
  })
  .refine(({ startsOn, endsOn }) => endsOn == null || endsOn >= startsOn, { path: ["endsOn"] })
  .refine(
    ({ kind, startsOn, endsOn }) =>
      !SINGLE_DAY_ACTION_KINDS.includes(kind) || endsOn == null || endsOn === startsOn,
    { path: ["endsOn"] }
  )
export type CreateActionInput = z.infer<typeof CreateActionInputSchema>

/** De qué elemento depende un extremo, de qué punto de ese elemento y con qué desfase. */
export const SetElementRuleInputSchema = z.object({
  predecessorId: z.uuid(),
  predecessorPoint: DatePointSchema,
  lag: z.object({ amount: z.number(), unit: DurationUnitSchema }),
})
export type SetElementRuleInput = z.infer<typeof SetElementRuleInputSchema>
