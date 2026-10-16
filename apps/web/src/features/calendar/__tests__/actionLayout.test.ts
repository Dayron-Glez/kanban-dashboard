import { DEFAULT_ELEMENT_DETAILS, type CalendarElement } from "@repo/contracts"
import { fromIsoDate } from "@repo/domain"
import { describe, expect, it } from "vitest"
import { layoutActions } from "../lib/actionLayout"
import type { ElementNode } from "../lib/elementTree"
import { buildTimeline } from "../lib/timeline"

const action = (
  id: string,
  startsOn: string,
  endsOn: string | null,
  kind: CalendarElement["kind"] = "task"
): ElementNode => ({
  element: {
    id,
    projectId: "p",
    kind,
    parentId: "proceso",
    position: 0,
    name: id,
    color: null,
    templateKey: null,
    duration: null,
    startsOn,
    endsOn,
    isAnchor: false,
    isPinned: true,
    issue: null,
    ...DEFAULT_ELEMENT_DETAILS,
  },
  depth: 2,
  phaseColor: null,
  children: [],
  actions: [],
})

// La rejilla empieza el lunes 12 oct 2026.
const timeline = buildTimeline(
  [action("plan", "2026-10-12", "2026-12-31").element],
  new Date(2026, 9, 13)
)!
const ids = (list: ElementNode[]) => list.map((node) => node.element.id)

describe("layoutActions", () => {
  it("cada periodo va al primer carril donde no pisa a otro", () => {
    const { lanes } = layoutActions(
      [
        action("a", "2026-10-12", "2026-10-14"),
        action("b", "2026-10-13", "2026-10-16"),
        action("c", "2026-10-15", "2026-10-17"),
      ],
      timeline,
      2
    )
    expect(lanes.map(ids)).toEqual([["a", "c"], ["b"]])
  })

  it("lo que no cabe en los carriles y las de un día se agrupan en su celda", () => {
    const { lanes, cells } = layoutActions(
      [
        action("a", "2026-10-12", "2026-10-14"),
        action("b", "2026-10-12", "2026-10-13"),
        action("reunion", "2026-10-12", "2026-10-12", "meeting"),
        action("sin-duracion", "2026-10-14", null),
      ],
      timeline,
      1
    )
    expect(lanes.map(ids)).toEqual([["a"]])
    expect(ids(cells.get(fromIsoDate("2026-10-12"))!)).toEqual(["b", "reunion"])
    expect(ids(cells.get(fromIsoDate("2026-10-14"))!)).toEqual(["sin-duracion"])
  })

  it("una contratación sin baja ocupa tres celdas: lo que empieza después no la pisa", () => {
    const { lanes } = layoutActions(
      [action("jefa", "2026-10-12", null, "hiring"), action("despues", "2026-10-15", "2026-10-16")],
      timeline,
      2
    )
    expect(lanes.map(ids)).toEqual([["jefa", "despues"]])
  })
})
