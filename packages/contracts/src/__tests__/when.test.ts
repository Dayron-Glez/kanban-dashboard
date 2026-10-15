import { describe, expect, it } from "vitest"
import { OpenWhenSchema, WhenSchema } from "../when.js"

const valid = (when: object) => OpenWhenSchema.safeParse(when).success
const failsAt = (when: object) =>
  OpenWhenSchema.safeParse(when).error?.issues.map((issue) => issue.path.join("."))

describe("el «Cuándo»", () => {
  it("un día entero, con todo el día por defecto", () => {
    expect(OpenWhenSchema.parse({ startsOn: "2026-10-16", endsOn: "2026-10-16" })).toEqual({
      startsOn: "2026-10-16",
      endsOn: "2026-10-16",
      allDay: true,
      startTime: null,
      endTime: null,
      hoursMode: null,
    })
  })

  it("varios días enteros", () => {
    expect(valid({ startsOn: "2026-10-16", endsOn: "2026-10-20" })).toBe(true)
  })

  it("unas horas de un día, sin horario y con el fin después del inicio", () => {
    const day = { startsOn: "2026-10-16", endsOn: "2026-10-16", allDay: false }
    expect(valid({ ...day, startTime: "09:00", endTime: "14:00" })).toBe(true)
    expect(failsAt({ ...day, startTime: "14:00", endTime: "09:00" })).toEqual(["endTime"])
    expect(failsAt({ ...day, startTime: "09:00" })).toEqual(["endTime"])
    expect(failsAt({ ...day, startTime: "09:00", endTime: "14:00", hoursMode: "daily" })).toEqual([
      "hoursMode",
    ])
  })

  it("varios días con las mismas horas cada día, sin cruzar la medianoche", () => {
    const days = { startsOn: "2026-10-16", endsOn: "2026-10-20", allDay: false, hoursMode: "daily" }
    expect(valid({ ...days, startTime: "09:00", endTime: "14:00" })).toBe(true)
    expect(failsAt({ ...days, startTime: "22:00", endTime: "06:00" })).toEqual(["endTime"])
  })

  it("varios días seguido, que puede cruzar la medianoche", () => {
    const days = {
      startsOn: "2026-10-16",
      endsOn: "2026-10-18",
      allDay: false,
      hoursMode: "continuous",
    }
    expect(valid({ ...days, startTime: "22:00", endTime: "06:00" })).toBe(true)
    expect(failsAt({ ...days, startTime: "22:00" })).toEqual(["endTime"])
  })

  it("con horas y varios días, el horario es obligatorio", () => {
    expect(
      failsAt({
        startsOn: "2026-10-16",
        endsOn: "2026-10-18",
        allDay: false,
        startTime: "09:00",
        endTime: "14:00",
      })
    ).toEqual(["hoursMode"])
  })

  it("sin fin: entero, cada día con hora de fin, o seguido sin ella", () => {
    const open = { startsOn: "2026-10-16", endsOn: null }
    expect(valid(open)).toBe(true)
    const hours = { ...open, allDay: false, startTime: "09:00" }
    expect(valid({ ...hours, hoursMode: "daily", endTime: "14:00" })).toBe(true)
    expect(valid({ ...hours, hoursMode: "continuous" })).toBe(true)
    expect(failsAt({ ...hours, hoursMode: "continuous", endTime: "14:00" })).toEqual(["endTime"])
    expect(failsAt({ ...hours, hoursMode: "daily" })).toEqual(["endTime"])
    expect(failsAt(hours)).toEqual(["hoursMode"])
  })

  it("todo el día va sin horas ni horario", () => {
    expect(
      failsAt({
        startsOn: "2026-10-16",
        endsOn: "2026-10-16",
        startTime: "09:00",
        hoursMode: "daily",
      })
    ).toEqual(["startTime", "hoursMode"])
  })

  it("con horas, la de inicio es obligatoria", () => {
    expect(failsAt({ startsOn: "2026-10-16", endsOn: "2026-10-16", allDay: false })).toEqual([
      "startTime",
    ])
  })

  it("el fin no es anterior al inicio, y las horas son HH:MM", () => {
    expect(failsAt({ startsOn: "2026-10-16", endsOn: "2026-10-15" })).toEqual(["endsOn"])
    expect(
      valid({
        startsOn: "2026-10-16",
        endsOn: "2026-10-16",
        allDay: false,
        startTime: "09:00:00",
        endTime: "14:00",
      })
    ).toBe(false)
  })

  it("el de las acciones no tiene fin abierto", () => {
    expect(WhenSchema.safeParse({ startsOn: "2026-10-16", endsOn: null }).success).toBe(false)
    expect(WhenSchema.safeParse({ startsOn: "2026-10-16", endsOn: "2026-10-16" }).success).toBe(
      true
    )
  })
})
