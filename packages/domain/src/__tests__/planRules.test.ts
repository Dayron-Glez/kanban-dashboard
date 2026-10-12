import { describe, expect, it } from "vitest"
import { buildCalendarTemplate, buildTemplateDependencies } from "../calendarTemplate"
import { validPredecessors, wouldCreateCycle } from "../planRules"

const link = (predecessorId: string, successorId: string) => ({ predecessorId, successorId })

// Postproducción → Edición → VFX → Creación VFX, como en el proyecto de ejemplo.
const links = [link("postproduccion", "edicion"), link("edicion", "vfx"), link("vfx", "creacion")]

describe("wouldCreateCycle", () => {
  it("una regla que no cierra nada es válida", () => {
    expect(wouldCreateCycle(links, link("rodaje", "postproduccion"))).toBeNull()
  })

  it("devuelve el ciclo en el orden de las fechas", () => {
    expect(wouldCreateCycle(links, link("creacion", "edicion"))).toEqual([
      "edicion",
      "vfx",
      "creacion",
      "edicion",
    ])
  })

  it("depender de su propio hijo cierra un ciclo", () => {
    expect(wouldCreateCycle(links, link("creacion", "vfx"))).toEqual(["vfx", "creacion", "vfx"])
  })

  it("nadie puede depender de sí mismo", () => {
    expect(wouldCreateCycle(links, link("vfx", "vfx"))).toEqual(["vfx", "vfx"])
  })
})

describe("validPredecessors", () => {
  it("quita al propio elemento y a todo lo que depende de él", () => {
    expect(
      validPredecessors(
        ["rodaje", "postproduccion", "edicion", "vfx", "creacion"],
        links,
        "edicion"
      )
    ).toEqual(["rodaje", "postproduccion"])
  })

  it("en la plantilla, Rodaje no puede depender de nada que cuelgue de él", () => {
    const elements = buildCalendarTemplate("film")
    const templateLinks = buildTemplateDependencies(elements).map((dependency) =>
      link(dependency.predecessorKey, dependency.successorKey)
    )
    const valid = validPredecessors(
      elements.map((element) => element.key),
      templateLinks,
      "rodaje"
    )

    expect(valid).toContain("desarrollo")
    expect(valid).not.toContain("preparacion")
    expect(valid).not.toContain("postproduccion.vfx.render")
    expect(valid).not.toContain("rodaje")
  })
})
