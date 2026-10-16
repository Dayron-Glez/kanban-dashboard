import { DEFAULT_ELEMENT_DETAILS, type CalendarElement } from "@repo/contracts"
import { describe, expect, it } from "vitest"
import { fromIsoDate } from "@repo/domain"
import { actionsInSpan, buildElementTree, descendantActions, flattenTree } from "../lib/elementTree"

const element = (
  id: string,
  parentId: string | null,
  position: number,
  overrides: Partial<CalendarElement> = {}
): CalendarElement => ({
  id,
  projectId: "p",
  kind: parentId ? "process" : "phase",
  parentId,
  position,
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
  ...overrides,
})

describe("buildElementTree", () => {
  it("anida por padre y ordena cada nivel por posición", () => {
    const tree = buildElementTree([
      element("vfx", "post", 1),
      element("post", null, 1),
      element("edicion", "post", 0),
      element("desarrollo", null, 0),
      element("render", "vfx", 0),
    ])

    expect(tree.map((node) => node.element.id)).toEqual(["desarrollo", "post"])
    expect(tree[1]?.children.map((node) => node.element.id)).toEqual(["edicion", "vfx"])
    expect(tree[1]?.children[1]?.children[0]).toMatchObject({ depth: 2 })
  })

  it("los descendientes heredan el color de su fase", () => {
    const tree = buildElementTree([
      element("rodaje", null, 0, { color: "#81DAD9" }),
      element("shooting", "rodaje", 0),
      element("dia-1", "shooting", 0, { kind: "task" }),
    ])

    expect(tree[0]?.children[0]?.actions[0]?.phaseColor).toBe("#81DAD9")
  })

  it("una acción suelta, sin fase, no tiene color", () => {
    const tree = buildElementTree([element("reunion", null, 0, { kind: "meeting" })])
    expect(tree[0]?.phaseColor).toBeNull()
  })

  it("las acciones no son filas: van aparte, en su padre, y se recorren tras él", () => {
    const tree = buildElementTree([
      element("rodaje", null, 0),
      element("lectura", "rodaje", 0, { kind: "meeting" }),
      element("shooting", "rodaje", 1),
      element("ensayo", "shooting", 0, { kind: "task" }),
    ])

    expect(tree[0]?.children.map((node) => node.element.id)).toEqual(["shooting"])
    expect(tree[0]?.actions.map((node) => node.element.id)).toEqual(["lectura"])
    expect(descendantActions(tree[0]!).map((node) => node.element.id)).toEqual(["ensayo"])
    expect(flattenTree(tree).map((node) => node.element.id)).toEqual([
      "rodaje",
      "lectura",
      "shooting",
      "ensayo",
    ])
  })

  it("las acciones que tocan unos días; plegada, también las de dentro", () => {
    const [rodaje] = buildElementTree([
      element("rodaje", null, 0),
      element("lectura", "rodaje", 0, {
        kind: "meeting",
        startsOn: "2026-10-14",
        endsOn: "2026-10-14",
      }),
      element("shooting", "rodaje", 1),
      element("jefa", "shooting", 0, { kind: "hiring", startsOn: "2026-10-01" }),
      element("antes", "shooting", 1, {
        kind: "task",
        startsOn: "2026-10-01",
        endsOn: "2026-10-02",
      }),
      element("sin-fin", "shooting", 2, { kind: "task", startsOn: "2026-10-01" }),
    ])
    const ids = (expanded: boolean) =>
      actionsInSpan(rodaje!, expanded, fromIsoDate("2026-10-14"), fromIsoDate("2026-10-14")).map(
        (node) => node.element.id
      )

    // Una contratación sin baja sigue en curso; una tarea sin duración, no.
    expect(ids(false)).toEqual(["lectura", "jefa"])
    expect(ids(true)).toEqual(["lectura"])
  })
})
