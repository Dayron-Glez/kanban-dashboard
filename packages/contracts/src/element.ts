import * as z from "zod"
import {
  ActionKindSchema,
  ActionPrioritySchema,
  DatePointSchema,
  DurationUnitSchema,
  ElementKindSchema,
  SINGLE_DAY_ACTION_KINDS,
  VideoAppSchema,
  type ActionKind,
  type ElementKind,
} from "./enums.js"
import { ALL_DAY, hoursIssues, HoursSchema, whenIssues, type Hours } from "./when.js"

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
  priority: ActionPrioritySchema,
  hours: HoursSchema,
  location: z.string().nullable(),
  notes: z.string().nullable(),
  completedAt: z.iso.datetime({ offset: true }).nullable(),
  videoApp: VideoAppSchema.nullable(),
  videoUrl: z.string().nullable(),
})
export type CalendarElement = z.infer<typeof CalendarElementSchema>

/** Lo que no es plan de un elemento, por defecto: sin horas, sin hacer y sin videollamada. */
export const DEFAULT_ELEMENT_DETAILS = {
  priority: "normal",
  hours: ALL_DAY,
  location: null,
  notes: null,
  completedAt: null,
  videoApp: null,
  videoUrl: null,
} satisfies Partial<CalendarElement>

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

const NameSchema = z.string().trim().min(1).max(120)
const LocationSchema = z.string().trim().max(200).nullable()
const NotesSchema = z.string().trim().max(10_000).nullable()
const VideoUrlSchema = z
  .url({ protocol: /^https?$/ })
  .max(2000)
  .nullable()

type ActionRuleFields = {
  kind: ElementKind
  startsOn: string | null
  endsOn: string | null
  hours: Hours
  completed?: boolean
  videoApp: string | null
  videoUrl: string | null
}

/**
 * Las reglas de una acción que dependen de su tipo o de sus fechas: los campos
 * que fallan. Las de las horas que no dependen de los días van en HoursSchema. Las comprueban la creación, la API al guardar (con las fechas ya
 * calculadas) y el formulario.
 */
export const actionIssues = (action: ActionRuleFields): string[][] => {
  const issues: string[][] = []
  const { kind, startsOn, endsOn, hours } = action
  if (startsOn !== null && endsOn !== null && endsOn < startsOn) issues.push(["endsOn"])
  if (
    SINGLE_DAY_ACTION_KINDS.includes(kind as ActionKind) &&
    endsOn !== null &&
    endsOn !== startsOn
  ) {
    issues.push(["endsOn"])
  }
  if (kind === "hiring" && !hours.allDay) issues.push(["hours", "allDay"])
  else if (startsOn !== null) {
    // Las que no dependen de los días ya las comprueba HoursSchema.
    const own = new Set<string>(hoursIssues(hours))
    const when = { ...hours, startsOn, endsOn: endsOn ?? startsOn }
    for (const path of whenIssues(when)) {
      if (path !== "startsOn" && path !== "endsOn" && !own.has(path)) issues.push(["hours", path])
    }
  }
  if (action.completed && kind !== "task") issues.push(["completed"])
  if (kind !== "meeting" && action.videoApp !== null) issues.push(["videoApp"])
  if (action.videoUrl !== null && action.videoApp === null) issues.push(["videoUrl"])
  return issues
}

/**
 * Una acción nueva en un día o un periodo. Sin fin, dura un día; una contratación
 * sin fin es una baja que aún no se conoce. Reuniones y recordatorios, un solo día.
 */
export const CreateActionInputSchema = z
  .object({
    kind: ActionKindSchema,
    name: NameSchema,
    startsOn: z.iso.date(),
    endsOn: z.iso.date().nullable().optional(),
    priority: ActionPrioritySchema.default("normal"),
    hours: HoursSchema.default(ALL_DAY),
    location: LocationSchema.default(null),
    notes: NotesSchema.default(null),
    completed: z.boolean().default(false),
    videoApp: VideoAppSchema.nullable().default(null),
    videoUrl: VideoUrlSchema.default(null),
  })
  .superRefine((input, ctx) => {
    const endsOn = input.endsOn ?? (input.kind === "hiring" ? null : input.startsOn)
    for (const path of actionIssues({ ...input, endsOn })) ctx.addIssue({ code: "custom", path })
  })
/** Lo que se envía: lo que tiene valor por defecto puede faltar. */
export type CreateActionInput = z.input<typeof CreateActionInputSchema>
/** Lo que recibe la API, ya validado y con los valores por defecto puestos. */
export type CreateActionData = z.output<typeof CreateActionInputSchema>

/** De qué elemento depende un extremo, de qué punto de ese elemento y con qué desfase. */
export const SetElementRuleInputSchema = z.object({
  predecessorId: z.uuid(),
  predecessorPoint: DatePointSchema,
  lag: z.object({ amount: z.number(), unit: DurationUnitSchema }),
})
export type SetElementRuleInput = z.infer<typeof SetElementRuleInputSchema>

/**
 * Lo que se guarda de una vez desde el panel de un elemento: todo en una sola
 * transacción, con un solo recálculo. El tipo y el padre solo cambian en las
 * acciones; en las reglas, null quita la de ese extremo.
 */
export const EditElementInputSchema = UpdateElementPlanInputSchema.extend({
  name: NameSchema.optional(),
  kind: ActionKindSchema.optional(),
  parentId: z.uuid().optional(),
  rules: z
    .object({
      start: SetElementRuleInputSchema.nullable().optional(),
      end: SetElementRuleInputSchema.nullable().optional(),
    })
    .optional(),
  priority: ActionPrioritySchema.optional(),
  hours: HoursSchema.optional(),
  location: LocationSchema.optional(),
  notes: NotesSchema.optional(),
  completed: z.boolean().optional(),
  videoApp: VideoAppSchema.nullable().optional(),
  videoUrl: VideoUrlSchema.optional(),
})
export type EditElementInput = z.infer<typeof EditElementInputSchema>
