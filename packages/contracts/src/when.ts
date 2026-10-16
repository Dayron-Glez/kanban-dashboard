import * as z from "zod"
import { HoursModeSchema } from "./enums.js"

export const TimeSchema = z.iso.time({ precision: -1 })

const hoursShape = {
  allDay: z.boolean().default(true),
  startTime: TimeSchema.nullable().default(null),
  endTime: TimeSchema.nullable().default(null),
  hoursMode: HoursModeSchema.nullable().default(null),
}

const whenShape = {
  startsOn: z.iso.date(),
  endsOn: z.iso.date(),
  ...hoursShape,
}

type HoursFields = {
  allDay: boolean
  startTime: string | null
  endTime: string | null
  hoursMode: string | null
}

type WhenFields = HoursFields & { startsOn: string; endsOn: string | null }

/** Las reglas de las horas que no dependen de cuántos días dura: los campos que fallan. */
export const hoursIssues = (hours: HoursFields): (keyof HoursFields)[] => {
  if (hours.allDay) {
    return (["startTime", "endTime", "hoursMode"] as const).filter((key) => hours[key] !== null)
  }
  if (hours.startTime === null) return ["startTime"]
  const endsAfterStart = hours.endTime !== null && hours.endTime > hours.startTime
  return hours.hoursMode === "daily" && !endsAfterStart ? ["endTime"] : []
}

/** Todas las reglas del «Cuándo», con sus fechas: los campos que fallan, en orden. */
export const whenIssues = (when: WhenFields): (keyof WhenFields)[] => {
  const issues: (keyof WhenFields)[] = []
  if (when.endsOn !== null && when.endsOn < when.startsOn) issues.push("endsOn")
  if (when.allDay || when.startTime === null) return [...issues, ...hoursIssues(when)]
  const endsAfterStart = when.endTime !== null && when.endTime > when.startTime
  if (when.endsOn === when.startsOn) {
    if (when.hoursMode !== null) issues.push("hoursMode")
    if (!endsAfterStart) issues.push("endTime")
    return issues
  }
  if (when.hoursMode === null) return [...issues, "hoursMode"]
  if (when.hoursMode === "daily" && !endsAfterStart) issues.push("endTime")
  if (when.hoursMode === "continuous" && (when.endTime === null) !== (when.endsOn === null)) {
    issues.push("endTime")
  }
  return issues
}

const checkWhen = (when: WhenFields, ctx: z.RefinementCtx) => {
  for (const path of whenIssues(when)) ctx.addIssue({ code: "custom", path: [path] })
}

/**
 * Cuándo ocurre algo: un día o varios, enteros o con horas locales del
 * proyecto, sin zona. Con horas y varios días, cada día las mismas horas
 * (`daily`) o seguido de la primera a la última (`continuous`); lo que cruza
 * la medianoche es seguido.
 */
export const WhenSchema = z.object(whenShape).superRefine(checkWhen)
export type When = z.infer<typeof WhenSchema>

/** El «Cuándo» con fin abierto: sin fecha de fin, «hasta nuevo aviso». */
export const OpenWhenSchema = z
  .object({ ...whenShape, endsOn: z.iso.date().nullable() })
  .superRefine(checkWhen)
export type OpenWhen = z.infer<typeof OpenWhenSchema>

/**
 * Las horas de una acción, sin sus fechas: las calcula el motor. Aquí van las
 * reglas que no dependen de cuántos días dura; las demás, con `whenIssues` una
 * vez se conocen las fechas.
 */
export const HoursSchema = z.object(hoursShape).superRefine((hours, ctx) => {
  for (const path of hoursIssues(hours)) ctx.addIssue({ code: "custom", path: [path] })
})
export type Hours = z.infer<typeof HoursSchema>

export const ALL_DAY: Hours = { allDay: true, startTime: null, endTime: null, hoursMode: null }
