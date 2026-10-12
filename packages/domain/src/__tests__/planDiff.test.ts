import { describe, expect, it } from "vitest"
import { fromIsoDate } from "../planDates"
import { diffSchedules } from "../planDiff"
import type { ScheduledDates } from "../schedule"

const d = fromIsoDate

const plan = (dates: Record<string, [string | null, string | null]>) =>
  new Map<string, ScheduledDates>(
    Object.entries(dates).map(([id, [start, end]]) => [
      id,
      { start: start ? d(start) : null, end: end ? d(end) : null, issue: null },
    ])
  )

const parents: Record<string, string | null> = {
  rodaje: null,
  "rodaje.shooting": "rodaje",
  "rodaje.wrap": "rodaje",
  preparacion: null,
  postproduccion: null,
  "postproduccion.vfx": "postproduccion",
}
const parentOf = (id: string) => parents[id] ?? null
const ids = Object.keys(parents)

describe("diffSchedules", () => {
  const before = plan({
    rodaje: ["2027-04-05", "2027-05-16"],
    "rodaje.shooting": ["2027-04-05", "2027-05-16"],
    "rodaje.wrap": ["2027-05-17", "2027-05-30"],
    preparacion: ["2027-02-01", "2027-04-04"],
    postproduccion: ["2027-04-05", "2027-10-31"],
    "postproduccion.vfx": ["2027-07-25", "2027-08-28"],
  })

  it("lista lo que se mueve, cuántos días y en el orden dado", () => {
    const after = plan({
      rodaje: ["2027-04-12", "2027-05-23"],
      "rodaje.shooting": ["2027-04-12", "2027-05-23"],
      "rodaje.wrap": ["2027-05-24", "2027-06-06"],
      preparacion: ["2027-02-08", "2027-04-11"],
      postproduccion: ["2027-04-12", "2027-11-07"],
      "postproduccion.vfx": ["2027-08-01", "2027-09-04"],
    })

    const changes = diffSchedules(ids, before, after, parentOf)

    expect(changes.map((change) => change.id)).toEqual(ids)
    expect(changes[0]).toMatchObject({ startShift: 7, endShift: 7, leavesParent: false })
  })

  it("lo que no cambia no aparece: si no se mueve nada, la lista está vacía", () => {
    expect(diffSchedules(ids, before, before, parentOf)).toEqual([])
  })

  it("un adelanto es negativo, y si solo cambia el fin, el inicio no se mueve", () => {
    const after = new Map(before)
    after.set("preparacion", { start: d("2027-01-25"), end: d("2027-04-04"), issue: null })
    after.set("postproduccion.vfx", { start: d("2027-07-25"), end: d("2027-09-04"), issue: null })

    const changes = diffSchedules(ids, before, after, parentOf)

    expect(changes.find((change) => change.id === "preparacion")).toMatchObject({
      startShift: -7,
      endShift: 0,
    })
    expect(changes.find((change) => change.id === "postproduccion.vfx")).toMatchObject({
      startShift: 0,
      endShift: 7,
    })
  })

  it("si un elemento se queda sin fecha, el desplazamiento es null", () => {
    const after = new Map(before)
    after.set("rodaje.wrap", {
      start: d("2027-05-17"),
      end: null,
      issue: { code: "missing-duration" },
    })

    expect(diffSchedules(ids, before, after, parentOf)).toEqual([
      expect.objectContaining({ id: "rodaje.wrap", startShift: 0, endShift: null }),
    ])
  })

  it("avisa si el cambio hace que algo empiece fuera de su padre", () => {
    const after = new Map(before)
    after.set("postproduccion.vfx", { start: d("2027-11-07"), end: d("2027-12-11"), issue: null })

    expect(diffSchedules(ids, before, after, parentOf)[0]).toMatchObject({
      id: "postproduccion.vfx",
      leavesParent: true,
    })
  })

  it("no avisa de lo que ya empezaba fuera: el Wrap nace tras el fin de Rodaje", () => {
    const after = new Map(before)
    after.set("rodaje.wrap", { start: d("2027-05-24"), end: d("2027-06-06"), issue: null })

    expect(diffSchedules(ids, before, after, parentOf)[0]).toMatchObject({
      id: "rodaje.wrap",
      leavesParent: false,
    })
  })

  it("una fase no tiene padre del que salirse", () => {
    const after = new Map(before)
    after.set("preparacion", { start: d("2026-01-01"), end: d("2027-04-04"), issue: null })

    expect(diffSchedules(ids, before, after, parentOf)[0]!.leavesParent).toBe(false)
  })
})
