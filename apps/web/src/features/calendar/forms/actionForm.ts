import {
  ACTION_KINDS,
  CreateActionInputSchema,
  DEFAULT_ELEMENT_DETAILS,
  SINGLE_DAY_ACTION_KINDS,
  type ActionKind,
  type CalendarElement,
} from "@repo/contracts"
import { actionDefaults, fromIsoDate } from "@repo/domain"
import * as z from "zod"
import { NEW_ACTION_TITLE } from "../lib/actionStyle"

/** El formulario de una acción: lo que se crea, más de qué cuelga. */
export const ActionFormSchema = CreateActionInputSchema.safeExtend({ parentId: z.string().min(1) })
export type ActionFormValues = z.input<typeof ActionFormSchema>
export type ActionFormData = z.output<typeof ActionFormSchema>

/** Lo que pide crear una acción desde una celda o desde el panel de un día. */
export interface NewActionRequest {
  parentId: string
  kind: ActionKind
  startsOn: string
  /** Vacío: un día, o una contratación cuya baja aún no se sabe. */
  endsOn: string | null
}

export const isSingleDay = (kind: ActionKind) => SINGLE_DAY_ACTION_KINDS.includes(kind)

export const newActionValues = ({
  parentId,
  kind,
  startsOn,
  endsOn,
}: NewActionRequest): ActionFormData => ({
  parentId,
  kind,
  name: "",
  startsOn,
  endsOn: isSingleDay(kind) ? null : endsOn,
  ...actionDefaults(kind),
})

const sameHours = (a: ActionFormData["hours"], b: ActionFormData["hours"]) =>
  a.allDay === b.allDay &&
  a.startTime === b.startTime &&
  a.endTime === b.endTime &&
  a.hoursMode === b.hoursMode

/**
 * Lo que cambia al pasar a otro tipo: las horas de serie si no se tocaron, un
 * solo día en reuniones y recordatorios, y fuera lo que el nuevo tipo no tiene.
 */
export const switchKind = (values: ActionFormData, next: ActionKind): Partial<ActionFormData> => {
  const before = actionDefaults(values.kind)
  const after = actionDefaults(next)
  return {
    kind: next,
    ...(isSingleDay(next) && values.endsOn !== null && { endsOn: null }),
    ...((sameHours(values.hours, before.hours) || next === "hiring") && { hours: after.hours }),
    ...(next !== "task" && values.completed && { completed: false }),
    ...(next !== "meeting" &&
      (values.videoApp !== null || values.videoUrl !== null) && { videoApp: null, videoUrl: null }),
  }
}

/** El id de la acción que se está creando, mientras se pinta como vista previa. */
export const PREVIEW_ID = "accion-nueva"

/** La acción que se está creando, tal como se pinta en el Gantt antes de guardarla. */
export const previewElement = (values: ActionFormData, projectId: string): CalendarElement => {
  const kind = ACTION_KINDS.includes(values.kind) ? values.kind : "event"
  const endsOn = values.endsOn ?? (kind === "hiring" ? null : values.startsOn)
  const days = endsOn === null ? null : fromIsoDate(endsOn) - fromIsoDate(values.startsOn) + 1
  return {
    id: PREVIEW_ID,
    projectId,
    kind,
    parentId: values.parentId,
    position: Number.MAX_SAFE_INTEGER,
    name: values.name.trim() || NEW_ACTION_TITLE[kind],
    color: null,
    templateKey: null,
    duration: days === null || days < 1 ? null : { amount: days, unit: "days" },
    startsOn: values.startsOn,
    endsOn,
    isAnchor: false,
    isPinned: true,
    issue: null,
    ...DEFAULT_ELEMENT_DETAILS,
    priority: values.priority,
    hours: values.hours,
  }
}
