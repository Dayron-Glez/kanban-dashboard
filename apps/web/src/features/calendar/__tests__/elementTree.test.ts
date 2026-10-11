import type { CalendarElement } from "@repo/contracts"
import { describe, expect, it } from "vitest"
import { buildElementTree } from "../lib/elementTree"

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

    expect(tree[0]?.children[0]?.children[0]?.phaseColor).toBe("#81DAD9")
  })

  it("una acción suelta, sin fase, no tiene color", () => {
    const tree = buildElementTree([element("reunion", null, 0, { kind: "meeting" })])
    expect(tree[0]?.phaseColor).toBeNull()
  })
})
