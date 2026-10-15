import { beforeEach, describe, expect, it } from "vitest"
import type { CalendarElement } from "@repo/contracts"
import {
  countActionKinds,
  hideActionKinds,
  loadHiddenKinds,
  saveHiddenKinds,
  soloKind,
  toggleKind,
} from "../lib/actionFilter"
import { buildElementTree, descendantActions } from "../lib/elementTree"

const element = (
  id: string,
  parentId: string | null,
  overrides: Partial<CalendarElement> = {}
): CalendarElement => ({
  id,
  projectId: "p",
  kind: parentId ? "process" : "phase",
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
  ...overrides,
})

const tree = () =>
  buildElementTree([
    element("rodaje", null),
    element("lectura", "rodaje", { kind: "meeting" }),
    element("shooting", "rodaje", { position: 1 }),
    element("ensayo", "shooting", { kind: "task" }),
    element("permisos", "shooting", { kind: "reminder", position: 1 }),
    element("suelta", null, { kind: "meeting", position: 1 }),
  ])

beforeEach(() => localStorage.clear())

describe("filtro de tipos de acción", () => {
  it("ocultar o mostrar un tipo; «solo este» deja uno, y repetido los muestra todos", () => {
    expect(toggleKind([], "task")).toEqual(["task"])
    expect(toggleKind(["task", "event"], "task")).toEqual(["event"])
    // En el orden de los tipos, sin importar el de los clics.
    expect(toggleKind(["task"], "event")).toEqual(["event", "task"])

    const solo = soloKind([], "meeting")
    expect(solo).not.toContain("meeting")
    expect(solo).toHaveLength(4)
    expect(soloKind(solo, "meeting")).toEqual([])
    expect(soloKind(solo, "task")).not.toContain("task")
  })

  it("quita las acciones ocultas a cualquier profundidad, y también las sueltas", () => {
    const shown = hideActionKinds(tree(), ["meeting", "task"])
    expect(shown.map((node) => node.element.id)).toEqual(["rodaje"])
    expect(shown[0]!.actions).toEqual([])
    expect(descendantActions(shown[0]!).map((node) => node.element.id)).toEqual(["permisos"])

    const all = tree()
    expect(hideActionKinds(all, [])).toBe(all)
  })

  it("cuenta las acciones de cada tipo", () => {
    expect(countActionKinds(tree())).toEqual({
      event: 0,
      task: 1,
      meeting: 2,
      reminder: 1,
      hiring: 0,
    })
  })

  it("se recuerda en el navegador, y lo que no es un tipo se ignora", () => {
    expect(loadHiddenKinds()).toEqual([])
    saveHiddenKinds(["hiring", "event"])
    expect(loadHiddenKinds()).toEqual(["event", "hiring"])
    localStorage.setItem("cauce.gantt.acciones-ocultas", '["phase","task"]')
    expect(loadHiddenKinds()).toEqual(["task"])
    localStorage.setItem("cauce.gantt.acciones-ocultas", "{roto")
    expect(loadHiddenKinds()).toEqual([])
  })
})
