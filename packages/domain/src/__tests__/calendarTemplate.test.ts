import type { ElementKind } from "@repo/contracts"
import { describe, expect, it } from "vitest"
import {
  buildCalendarTemplate,
  buildTemplateDependencies,
  CALENDAR_TEMPLATE,
  type TemplateDependency,
  type TemplateElement,
} from "../calendarTemplate"
import { fromIsoDate } from "../planDates"
import { computeSchedule } from "../schedule"

const names = (elements: TemplateElement[]) => elements.map((element) => element.name)
const ofKind = (elements: TemplateElement[], kind: ElementKind) =>
  elements.filter((element) => element.kind === kind)

const ALLOWED_PARENTS: Record<string, (ElementKind | null)[]> = {
  phase: [null],
  subphase: ["phase"],
  process: ["phase", "subphase"],
  task: ["phase", "subphase", "process"],
  event: ["phase", "subphase", "process"],
}

describe("CALENDAR_TEMPLATE", () => {
  it("tiene 40 procesos entre todos los tipos de proyecto", () => {
    const count = (nodes: typeof CALENDAR_TEMPLATE): number =>
      nodes.reduce(
        (total, node) => total + (node.kind === "process" ? 1 : 0) + count(node.children ?? []),
        0
      )
    expect(count(CALENDAR_TEMPLATE)).toBe(40)
  })
})

describe("buildCalendarTemplate", () => {
  const film = buildCalendarTemplate("film")
  const series = buildCalendarTemplate("series")
  const documentary = buildCalendarTemplate("documentary")

  it("crea las 7 fases en orden, con su color", () => {
    const phases = ofKind(film, "phase")
    expect(names(phases)).toEqual([
      "Desarrollo",
      "SoftPre",
      "Preparación",
      "Rodaje",
      "Postproducción",
      "Explotación",
      "Acreditación de coste",
    ])
    expect(phases.map((phase) => phase.position)).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(phases.every((phase) => phase.color)).toBe(true)
    expect(film.filter((element) => element.kind !== "phase" && element.color)).toEqual([])
  })

  it.each([
    ["film", film],
    ["series", series],
  ])("en %s, las claves son únicas y cada elemento cuelga de donde puede", (_, elements) => {
    const byKey = new Map(elements.map((element) => [element.key, element]))
    expect(byKey.size).toBe(elements.length)
    elements.forEach((element, index) => {
      const parent = element.parentKey ? byKey.get(element.parentKey) : undefined
      expect(ALLOWED_PARENTS[element.kind]).toContain(parent?.kind ?? null)
      if (parent) expect(elements.indexOf(parent)).toBeLessThan(index)
    })
  })

  it("numera las posiciones de cada nivel sin huecos", () => {
    const parents = new Set(series.map((element) => element.parentKey))
    for (const parentKey of parents) {
      const group = series.filter((element) => element.parentKey === parentKey)
      expect(group.map((element) => element.position)).toEqual(group.map((_, index) => index))
    }
  })

  it("cine lleva Argumento y no Biblia ni Mapa de trama", () => {
    expect(names(film)).toContain("Argumento")
    expect(names(film)).not.toContain("Biblia")
    expect(names(film)).not.toContain("Mapa de trama de personajes")
    expect(names(film)).toContain("Escritura de guion")
    expect(ofKind(film, "process")).toHaveLength(38)
  })

  it("serie lleva Biblia, Mapa de trama y guiones, y no Argumento", () => {
    expect(names(series)).toContain("Biblia")
    expect(names(series)).toContain("Mapa de trama de personajes")
    expect(names(series)).toContain("Escritura de guiones")
    expect(names(series)).not.toContain("Argumento")
    expect(ofKind(series, "process")).toHaveLength(39)
  })

  it("documental usa la plantilla de cine mientras no tenga la suya", () => {
    expect(documentary).toEqual(film)
  })

  it("Conformado, Etalonado, Mezcla y Copia Master cuelgan de Postproducción", () => {
    const children = film.filter((element) => element.parentKey === "postproduccion")
    expect(children.map((element) => `${element.kind}:${element.name}`)).toEqual([
      "subphase:Edición",
      "subphase:VFX",
      "process:Conformado",
      "process:Etalonado",
      "subphase:Música",
      "subphase:Montaje de Sonido",
      "process:Mezcla",
      "process:Copia Master",
      "subphase:Deliveries",
    ])
  })

  it("Rodaje nace con Shooting y Wrap, y Preparación sin los procesos de SoftPre", () => {
    expect(names(film.filter((element) => element.parentKey === "rodaje"))).toEqual([
      "Shooting",
      "Wrap",
    ])
    expect(film.filter((element) => element.parentKey === "preparacion")).toHaveLength(5)
  })

  it("las acciones comunes son tareas, salvo la luz verde, que es un evento", () => {
    expect(ofKind(film, "task")).toHaveLength(9)
    expect(ofKind(film, "event")).toEqual([
      expect.objectContaining({
        key: "desarrollo.luz-verde",
        name: "Luz verde al proyecto (financiación completa)",
      }),
    ])
  })

  it("las claves siguen la ruta del árbol", () => {
    expect(film.map((element) => element.key)).toContain("postproduccion.vfx.render")
    expect(film.map((element) => element.key)).toContain("softpre.casting.busqueda")
  })
})

describe("buildTemplateDependencies", () => {
  const film = buildCalendarTemplate("film")
  const dependencies = buildTemplateDependencies(film)
  const startOf = (key: string) =>
    dependencies.find(
      (dependency) => dependency.successorKey === key && dependency.successorPoint === "start"
    )
  const describeLink = (dependency: TemplateDependency | undefined) =>
    dependency &&
    `${dependency.predecessorKey}.${dependency.predecessorPoint} ${dependency.lagAmount >= 0 ? "+" : ""}${dependency.lagAmount}`

  it("Rodaje es el ancla y Desarrollo está fijado", () => {
    expect(film.filter((element) => element.isAnchor).map((element) => element.key)).toEqual([
      "rodaje",
    ])
    expect(film.filter((element) => element.isPinned).map((element) => element.key)).toEqual([
      "desarrollo",
    ])
  })

  it("las fases se encadenan como en la tabla del README", () => {
    const endOf = (key: string) =>
      dependencies.find(
        (dependency) => dependency.successorKey === key && dependency.successorPoint === "end"
      )
    expect(describeLink(endOf("preparacion"))).toBe("rodaje.start -1")
    expect(describeLink(endOf("softpre"))).toBe("preparacion.start -1")
    expect(describeLink(startOf("postproduccion"))).toBe("rodaje.start +0")
    expect(describeLink(startOf("explotacion"))).toBe("postproduccion.end +1")
    expect(describeLink(startOf("acreditacion-de-coste"))).toBe("explotacion.end +1")
  })

  it("el Shooting ocupa lo que Rodaje y el Wrap empieza al día siguiente", () => {
    const shooting = dependencies.filter(
      (dependency) => dependency.successorKey === "rodaje.shooting"
    )
    expect(shooting.map(describeLink)).toEqual(["rodaje.start +0", "rodaje.end +0"])
    expect(describeLink(startOf("rodaje.wrap"))).toBe("rodaje.shooting.end +1")
  })

  it("lo demás empieza con el elemento del que cuelga", () => {
    expect(describeLink(startOf("postproduccion.vfx.render"))).toBe("postproduccion.vfx.start +0")
    expect(describeLink(startOf("softpre.casting.busqueda"))).toBe("softpre.casting.start +0")
    expect(describeLink(startOf("desarrollo.luz-verde"))).toBe("desarrollo.end +0")
  })

  it("las fases sin regla propia no dependen de nada", () => {
    expect(startOf("desarrollo")).toBeUndefined()
    expect(startOf("rodaje")).toBeUndefined()
  })

  it.each(["film", "series", "documentary"] as const)(
    "en %s, sin ciclos y todo se alcanza desde el ancla o desde Desarrollo",
    (kind) => {
      const elements = buildCalendarTemplate(kind)
      const result = computeSchedule(
        elements.map((element) => ({
          id: element.key,
          durationAmount: 1,
          durationUnit: "weeks",
          isAnchor: element.isAnchor,
          isPinned: element.isPinned,
          fixedStart: element.isAnchor
            ? fromIsoDate("2027-04-05")
            : element.isPinned
              ? fromIsoDate("2026-01-01")
              : null,
        })),
        buildTemplateDependencies(elements).map((dependency) => ({
          ...dependency,
          predecessorId: dependency.predecessorKey,
          successorId: dependency.successorKey,
        }))
      )
      const unscheduled = [...result].filter(([, dates]) => dates.issue).map(([key]) => key)
      expect(unscheduled).toEqual([])
    }
  )

  it("solo enlaza elementos que existen en el proyecto", () => {
    const keys = new Set(film.map((element) => element.key))
    for (const dependency of dependencies) {
      expect(keys).toContain(dependency.predecessorKey)
      expect(keys).toContain(dependency.successorKey)
    }
  })
})
