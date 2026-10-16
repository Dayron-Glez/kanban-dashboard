import * as z from "zod"
import { HoursModeSchema } from "./enums.js"

const TimeSchema = z.iso.time({ precision: -1 })

const whenShape = {
  startsOn: z.iso.date(),
  endsOn: z.iso.date(),
  allDay: z.boolean().default(true),
  startTime: TimeSchema.nullable().default(null),
  endTime: TimeSchema.nullable().default(null),
  hoursMode: HoursModeSchema.nullable().default(null),
}

type WhenFields = {
  startsOn: string
  endsOn: string | null
  allDay: boolean
  startTime: string | null
  endTime: string | null
  hoursMode: string | null
}

const checkWhen = (when: WhenFields, ctx: z.RefinementCtx) => {
  const fail = (path: keyof WhenFields) => ctx.addIssue({ code: "custom", path: [path] })
  if (when.endsOn !== null && when.endsOn < when.startsOn) fail("endsOn")
  if (when.allDay) {
    if (when.startTime !== null) fail("startTime")
    if (when.endTime !== null) fail("endTime")
    if (when.hoursMode !== null) fail("hoursMode")
    return
  }
  if (when.startTime === null) return fail("startTime")
  const endsAfterStart = when.endTime !== null && when.endTime > when.startTime
  if (when.endsOn === when.startsOn) {
    if (when.hoursMode !== null) fail("hoursMode")
    if (!endsAfterStart) fail("endTime")
    return
  }
  if (when.hoursMode === null) return fail("hoursMode")
  if (when.hoursMode === "daily" && !endsAfterStart) fail("endTime")
  if (when.hoursMode === "continuous" && (when.endTime === null) !== (when.endsOn === null)) {
    fail("endTime")
  }
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
