import { SINGLE_DAY_ACTION_KINDS, type ActionKind, type EditElementInput } from "@repo/contracts"

/** El color de cada tipo de acción: el mismo en toda la app (tokens de tailwind.css). */
export const ACTION_COLOR: Record<ActionKind, string> = {
  event: "text-action-event",
  task: "text-action-task",
  meeting: "text-action-meeting",
  reminder: "text-action-reminder",
  hiring: "text-action-hiring",
  travel: "text-action-travel",
}

/** El mismo color, de fondo: los puntos del calendario. */
export const ACTION_BG: Record<ActionKind, string> = {
  event: "bg-action-event",
  task: "bg-action-task",
  meeting: "bg-action-meeting",
  reminder: "bg-action-reminder",
  hiring: "bg-action-hiring",
  travel: "bg-action-travel",
}

// Para decir qué se borra: «la reunión», «el evento».
const WHAT: Record<ActionKind, string> = {
  event: "el evento",
  task: "la tarea",
  meeting: "la reunión",
  reminder: "el recordatorio",
  hiring: "la contratación",
  travel: "el viaje",
}

/** El título del formulario de crear, con el género de cada tipo. */
export const NEW_ACTION_TITLE: Record<ActionKind, string> = {
  event: "Nuevo evento",
  task: "Nueva tarea",
  meeting: "Nueva reunión",
  reminder: "Nuevo recordatorio",
  hiring: "Nueva contratación",
  travel: "Nuevo viaje",
}

/** «la reunión “Lectura de guion”». */
export const describeAction = (action: { kind: ActionKind; name: string }) =>
  `${WHAT[action.kind]} “${action.name}”`

/** Cambiar el tipo: pasar a reunión o recordatorio deja la acción en un día, como pide la API. */
export function kindChange(
  action: { startsOn: string | null; endsOn: string | null },
  next: ActionKind
): EditElementInput {
  const multiDay = action.endsOn != null && action.endsOn !== action.startsOn
  return SINGLE_DAY_ACTION_KINDS.includes(next) && multiDay
    ? { kind: next, duration: { amount: 1, unit: "days" } }
    : { kind: next }
}
