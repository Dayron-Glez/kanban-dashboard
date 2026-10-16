import { ALL_DAY, type ActionKind, type CreateActionData } from "@repo/contracts"

export type ActionDefaults = Pick<
  CreateActionData,
  "priority" | "hours" | "location" | "notes" | "completed" | "videoApp" | "videoUrl"
>

/**
 * Con qué nace cada tipo de acción, aparte de su nombre y sus fechas. Todas son
 * de todo el día salvo la reunión, de 10:00 a 11:00. Los avisos de serie llegan
 * con los avisos.
 */
export const actionDefaults = (kind: ActionKind): ActionDefaults => ({
  priority: "normal",
  hours:
    kind === "meeting"
      ? { allDay: false, startTime: "10:00", endTime: "11:00", hoursMode: null }
      : ALL_DAY,
  location: null,
  notes: null,
  completed: false,
  videoApp: null,
  videoUrl: null,
})
