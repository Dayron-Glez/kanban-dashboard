import type { ActionKind } from "@repo/contracts"

/** El color de cada tipo de acción: el mismo en toda la app (tokens de tailwind.css). */
export const ACTION_COLOR: Record<ActionKind, string> = {
  event: "text-action-event",
  task: "text-action-task",
  meeting: "text-action-meeting",
  reminder: "text-action-reminder",
  hiring: "text-action-hiring",
}
