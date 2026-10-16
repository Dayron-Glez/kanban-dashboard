import { DEFAULT_ELEMENT_DETAILS, type CalendarElement } from "@repo/contracts"
import { describe, expect, it } from "vitest"
import { elementPath } from "../lib/elementPath"

const element = (id: string, parentId: string | null, kind: CalendarElement["kind"]) =>
  ({
    id,
    projectId: "p",
    kind,
    parentId,
    position: 0,
    name: id,
    color: null,
    templateKey: null,
    duration: null,
    startsOn: null,
    endsOn: null,
    isAnchor: false,
    isPinned: false,
    issue: null,
    ...DEFAULT_ELEMENT_DETAILS,
  }) satisfies CalendarElement

describe("la ruta de un elemento", () => {
  it("de qué cuelga, de arriba abajo, y qué es", () => {
    const rodaje = element("Rodaje", null, "phase")
    const bloque = element("Bloque 1", "Rodaje", "subphase")
    const shooting = element("Shooting", "Bloque 1", "process")
    const lectura = element("Lectura", "Shooting", "meeting")
    expect(elementPath([rodaje, bloque, shooting, lectura], lectura)).toEqual([
      "Rodaje",
      "Bloque 1",
      "Shooting",
      "Reunión",
    ])
    expect(elementPath([rodaje], rodaje)).toEqual(["Fase"])
  })
})
