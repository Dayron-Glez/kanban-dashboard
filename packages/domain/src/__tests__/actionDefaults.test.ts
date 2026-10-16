import { ACTION_KINDS, CreateActionInputSchema } from "@repo/contracts"
import { describe, expect, it } from "vitest"
import { actionDefaults } from "../actionDefaults"

describe("con qué nace cada tipo de acción", () => {
  it("la reunión, de 10:00 a 11:00; el resto, de todo el día", () => {
    expect(actionDefaults("meeting").hours).toEqual({
      allDay: false,
      startTime: "10:00",
      endTime: "11:00",
      hoursMode: null,
    })
    for (const kind of ACTION_KINDS.filter((kind) => kind !== "meeting")) {
      expect(actionDefaults(kind).hours.allDay).toBe(true)
    }
  })

  it("normal, sin hacer y sin nada más", () => {
    expect(actionDefaults("task")).toMatchObject({
      priority: "normal",
      location: null,
      notes: null,
      completed: false,
      videoApp: null,
      videoUrl: null,
    })
  })

  it("lo de cada tipo es una acción válida para crear en un día", () => {
    for (const kind of ACTION_KINDS) {
      const input = { kind, name: "Nueva", startsOn: "2027-04-14", ...actionDefaults(kind) }
      expect(CreateActionInputSchema.safeParse(input).success).toBe(true)
    }
  })
})
