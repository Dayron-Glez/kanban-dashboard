import type { Alert, ElementKind, OpenWhen } from "@repo/contracts"
import { describe, expect, it } from "vitest"
import { findAlertConflicts } from "../alertConflicts"

const element = (
  id: string,
  startsOn: string | null,
  endsOn: string | null = startsOn,
  kind: ElementKind = "event"
) => ({ id, kind, startsOn, endsOn })

const alert = (when: Partial<OpenWhen>, scope: Alert["scope"] = "project") => ({
  id: "huelga",
  scope,
  when: {
    startsOn: "2026-10-16",
    endsOn: "2026-10-16",
    allDay: true,
    startTime: null,
    endTime: null,
    hoursMode: null,
    ...when,
  },
})

const hours = (startTime: string, endTime: string | null, hoursMode: OpenWhen["hoursMode"]) => ({
  allDay: false,
  startTime,
  endTime,
  hoursMode,
})

const conflictsOf = (elements: ReturnType<typeof element>[], when: Partial<OpenWhen>) =>
  findAlertConflicts(elements, [alert(when)]).map(({ elementId, from, to, extent }) => ({
    elementId,
    from,
    to,
    extent,
  }))

describe("findAlertConflicts", () => {
  it("un día entero choca entero con lo que cae ese día", () => {
    expect(conflictsOf([element("rodaje", "2026-10-16")], {})).toEqual([
      { elementId: "rodaje", from: "2026-10-16", to: "2026-10-16", extent: "full" },
    ])
  })

  it("varios días enteros: los días en que se cruzan, y solo si se cruzan", () => {
    const elements = [
      element("antes", "2026-10-10", "2026-10-15"),
      element("cruza", "2026-10-14", "2026-10-17"),
      element("dentro", "2026-10-18", "2026-10-19"),
      element("despues", "2026-10-21", "2026-10-25"),
    ]
    expect(conflictsOf(elements, { endsOn: "2026-10-20" })).toEqual([
      { elementId: "cruza", from: "2026-10-16", to: "2026-10-17", extent: "full" },
      { elementId: "dentro", from: "2026-10-18", to: "2026-10-19", extent: "full" },
    ])
  })

  it("unas horas de un día: parcial", () => {
    expect(
      conflictsOf([element("reunion", "2026-10-16")], hours("09:00", "14:00", null))
    ).toMatchObject([{ extent: "partial" }])
  })

  it("las mismas horas cada día: parcial todos los días", () => {
    expect(
      conflictsOf([element("rodaje", "2026-10-17", "2026-10-18")], {
        endsOn: "2026-10-20",
        ...hours("09:00", "14:00", "daily"),
      })
    ).toEqual([{ elementId: "rodaje", from: "2026-10-17", to: "2026-10-18", extent: "partial" }])
  })

  it("seguido: los días de en medio, enteros; el primero y el último, parciales", () => {
    const when = { endsOn: "2026-10-18", ...hours("22:00", "06:00", "continuous") }
    const elements = [
      element("medio", "2026-10-17"),
      element("primero", "2026-10-16"),
      element("ultimo", "2026-10-18"),
      element("todo", "2026-10-15", "2026-10-20"),
    ]
    expect(conflictsOf(elements, when)).toEqual([
      { elementId: "medio", from: "2026-10-17", to: "2026-10-17", extent: "full" },
      { elementId: "primero", from: "2026-10-16", to: "2026-10-16", extent: "partial" },
      { elementId: "ultimo", from: "2026-10-18", to: "2026-10-18", extent: "partial" },
      { elementId: "todo", from: "2026-10-16", to: "2026-10-18", extent: "partial" },
    ])
  })

  it("seguido desde las 0:00 o hasta las 0:00: ese día cuenta entero, o no cuenta", () => {
    const when = { endsOn: "2026-10-18", ...hours("00:00", "00:00", "continuous") }
    expect(conflictsOf([element("todo", "2026-10-15", "2026-10-20")], when)).toEqual([
      { elementId: "todo", from: "2026-10-16", to: "2026-10-17", extent: "full" },
    ])
  })

  it("sin fin: choca con todo lo que venga después, hasta su fin", () => {
    const elements = [
      element("antes", "2026-10-01", "2026-10-15"),
      element("lejos", "2027-03-01", "2027-03-05"),
    ]
    expect(conflictsOf(elements, { endsOn: null })).toEqual([
      { elementId: "lejos", from: "2027-03-01", to: "2027-03-05", extent: "full" },
    ])
    expect(conflictsOf(elements, { endsOn: null, ...hours("22:00", null, "continuous") })).toEqual([
      { elementId: "lejos", from: "2027-03-01", to: "2027-03-05", extent: "full" },
    ])
    expect(
      conflictsOf(elements, { endsOn: null, ...hours("09:00", "14:00", "daily") })
    ).toMatchObject([{ elementId: "lejos", extent: "partial" }])
  })

  it("una contratación sin baja sigue activa", () => {
    const hiring = element("contrato", "2026-10-01", null, "hiring")
    expect(conflictsOf([hiring], { endsOn: "2026-10-20" })).toEqual([
      { elementId: "contrato", from: "2026-10-16", to: "2026-10-20", extent: "full" },
    ])
    expect(conflictsOf([hiring], { endsOn: null })).toEqual([
      { elementId: "contrato", from: "2026-10-16", to: null, extent: "full" },
    ])
  })

  it("otra acción sin fin solo ocupa su día de inicio", () => {
    expect(conflictsOf([element("tarea", "2026-10-15", null, "task")], {})).toEqual([])
  })

  it("solo acciones y procesos con fechas, y solo alertas de todo el proyecto", () => {
    const elements = [
      element("rodaje", "2026-10-01", "2026-10-30", "phase"),
      element("bloque", "2026-10-01", "2026-10-30", "subphase"),
      element("shooting", "2026-10-01", "2026-10-30", "process"),
      element("viaje", "2026-10-16", "2026-10-16", "travel"),
      element("sin-fechas", null, null, "meeting"),
    ]
    expect(conflictsOf(elements, {}).map((conflict) => conflict.elementId)).toEqual([
      "shooting",
      "viaje",
    ])
    expect(findAlertConflicts(elements, [alert({}, "targeted")])).toEqual([])
  })

  it("dice de qué alerta es cada conflicto", () => {
    expect(findAlertConflicts([element("viaje", "2026-10-16")], [alert({})])).toEqual([
      {
        alertId: "huelga",
        elementId: "viaje",
        from: "2026-10-16",
        to: "2026-10-16",
        extent: "full",
      },
    ])
  })
})
