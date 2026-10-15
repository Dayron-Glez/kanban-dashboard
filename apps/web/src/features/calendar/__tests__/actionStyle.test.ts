import { describe, expect, it } from "vitest"
import { kindChange } from "../lib/actionStyle"

const period = { kind: "task", startsOn: "2027-04-02", endsOn: "2027-04-04" }
const oneDay = { kind: "task", startsOn: "2027-04-02", endsOn: "2027-04-02" }
const open = { kind: "hiring", startsOn: "2027-04-02", endsOn: null }
// Una tarea de la plantilla sin duración todavía: cambiar de tipo no se la inventa.
const noDuration = { kind: "task", startsOn: "2027-04-02", endsOn: null }

describe("cambiar el tipo de una acción", () => {
  it("un periodo que pasa a reunión o recordatorio se queda en un día", () => {
    expect(kindChange(period, "meeting")).toEqual({
      kind: "meeting",
      duration: { amount: 1, unit: "days" },
    })
    expect(kindChange(period, "reminder")).toEqual({
      kind: "reminder",
      duration: { amount: 1, unit: "days" },
    })
  })

  it("un periodo que pasa a viaje, evento o tarea conserva sus días", () => {
    expect(kindChange(period, "travel")).toEqual({ kind: "travel" })
    expect(kindChange(period, "task")).toEqual({ kind: "task" })
    expect(kindChange(oneDay, "meeting")).toEqual({ kind: "meeting" })
  })

  it("una contratación sin baja que pasa a otro tipo dura un día; si sigue abierta, no", () => {
    expect(kindChange(open, "travel")).toEqual({
      kind: "travel",
      duration: { amount: 1, unit: "days" },
    })
    expect(kindChange(open, "event")).toEqual({
      kind: "event",
      duration: { amount: 1, unit: "days" },
    })
    expect(kindChange(open, "hiring")).toEqual({ kind: "hiring" })
    expect(kindChange(noDuration, "event")).toEqual({ kind: "event" })
  })
})
