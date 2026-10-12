import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { CalendarElement, CalendarPlan, ElementDependency } from "@repo/contracts"
import { beforeAll, describe, expect, it, vi } from "vitest"
import { ElementInspector } from "../components/ElementInspector"

const element = (
  id: string,
  name: string,
  parentId: string | null,
  overrides: Partial<CalendarElement> = {}
): CalendarElement => ({
  id,
  projectId: "p",
  kind: parentId ? "subphase" : "phase",
  parentId,
  position: 0,
  name,
  color: parentId ? null : "#819DDA",
  templateKey: id,
  duration: null,
  startsOn: null,
  endsOn: null,
  isAnchor: false,
  isPinned: false,
  issue: null,
  ...overrides,
})

const rule = (
  id: string,
  predecessorId: string,
  predecessorPoint: ElementDependency["predecessorPoint"],
  successorId: string,
  successorPoint: ElementDependency["successorPoint"],
  amount: number,
  unit: ElementDependency["lag"]["unit"]
): ElementDependency => ({
  id,
  predecessorId,
  predecessorPoint,
  successorId,
  successorPoint,
  lag: { amount, unit },
})

// jsdom no trae lo que Radix Select usa para abrirse con el puntero.
beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.releasePointerCapture = () => {}
  Element.prototype.scrollIntoView = () => {}
})

// Postproducción ⊃ Edición y VFX ⊃ Creación VFX, con las reglas del ejemplo.
const plan: CalendarPlan = {
  elements: [
    element("post", "Postproducción", null, { isAnchor: true, startsOn: "2027-04-05" }),
    element("edicion", "Edición", "post", {
      duration: { amount: 20, unit: "weeks" },
      startsOn: "2027-04-05",
      endsOn: "2027-08-22",
    }),
    element("vfx", "VFX", "post", {
      duration: { amount: 5, unit: "weeks" },
      startsOn: "2027-07-25",
      endsOn: "2027-08-28",
    }),
    element("creacion", "Creación VFX", "vfx", { kind: "process" }),
  ],
  dependencies: [
    rule("d1", "post", "start", "edicion", "start", 0, "days"),
    rule("d2", "edicion", "end", "vfx", "start", -4, "weeks"),
    rule("d3", "vfx", "start", "creacion", "start", 0, "days"),
  ],
}

const renderSheet = (
  elementId: string,
  editable = true,
  planSpan: { start: string; end: string } | null = null
) => {
  const handlers = {
    onUpdate: vi.fn(),
    onMoveDate: vi.fn(),
    onSetRule: vi.fn(),
    onRemoveRule: vi.fn(),
    onClose: vi.fn(),
    onOpen: vi.fn(),
  }
  render(
    <ElementInspector
      elementId={elementId}
      plan={plan}
      editable={editable}
      pending={false}
      planSpan={planSpan}
      {...handlers}
    />
  )
  return handlers
}

describe("ElementInspector", () => {
  it("enseña las fechas, de dónde cuelga y su regla como frase", () => {
    renderSheet("vfx")

    expect(screen.getByRole("heading", { name: "VFX" })).toBeInTheDocument()
    expect(screen.getByText("Postproducción › Subfase")).toBeInTheDocument()
    expect(screen.getByText("dom 25 jul 2027")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cuánto" })).toHaveTextContent("4 semanas")
    expect(screen.getByRole("button", { name: "Antes, a la vez o después" })).toHaveTextContent(
      "antes del"
    )
    expect(screen.getByRole("button", { name: "Desde qué fecha" })).toHaveTextContent("fin")
    expect(screen.getByRole("button", { name: "De qué elemento" })).toHaveTextContent("Edición")
  })

  it("cada ficha cambia su parte de la regla, sin números negativos", async () => {
    const { onSetRule } = renderSheet("vfx")

    await userEvent.click(screen.getByRole("button", { name: "Antes, a la vez o después" }))
    await userEvent.click(screen.getByRole("option", { name: "después del" }))
    expect(onSetRule).toHaveBeenLastCalledWith("vfx", "start", {
      predecessorId: "edicion",
      predecessorPoint: "end",
      lag: { amount: 4, unit: "weeks" },
    })

    await userEvent.click(screen.getByRole("button", { name: "Cuánto" }))
    const amount = screen.getByLabelText("Cantidad del desfase")
    await userEvent.clear(amount)
    await userEvent.type(amount, "3,5")
    await userEvent.click(screen.getByRole("button", { name: "Aplicar" }))
    expect(onSetRule).toHaveBeenLastCalledWith("vfx", "start", {
      predecessorId: "edicion",
      predecessorPoint: "end",
      lag: { amount: -3.5, unit: "weeks" },
    })

    await userEvent.click(screen.getByRole("button", { name: "Desde qué fecha" }))
    await userEvent.click(screen.getByRole("option", { name: "inicio" }))
    expect(onSetRule).toHaveBeenLastCalledWith(
      "vfx",
      "start",
      expect.objectContaining({ predecessorPoint: "start" })
    )
  })

  it("«con el» quita el desfase", async () => {
    const { onSetRule } = renderSheet("vfx")

    await userEvent.click(screen.getByRole("button", { name: "Antes, a la vez o después" }))
    await userEvent.click(screen.getByRole("option", { name: "con el" }))

    expect(onSetRule).toHaveBeenLastCalledWith(
      "vfx",
      "start",
      expect.objectContaining({ lag: { amount: 0, unit: "weeks" } })
    )
  })

  it("el buscador de elementos no ofrece depender de uno mismo ni de lo que cuelga de él", async () => {
    const { onSetRule } = renderSheet("vfx")

    await userEvent.click(screen.getByRole("button", { name: "De qué elemento" }))
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Postproducción",
      "Edición",
    ])

    await userEvent.type(screen.getByPlaceholderText("Buscar un elemento…"), "post")
    await userEvent.click(screen.getByRole("option", { name: "Postproducción" }))
    expect(onSetRule).toHaveBeenLastCalledWith(
      "vfx",
      "start",
      expect.objectContaining({ predecessorId: "post" })
    )
  })

  it("el ancla no tiene regla que cambiar: su fecha se escribe a mano", () => {
    renderSheet("post")

    expect(screen.getByText("La fecha clave del plan")).toBeInTheDocument()
    expect(screen.getByText(/Mueve 3 elementos/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "De qué elemento" })).toBeNull()
  })

  it("las fechas se escriben directamente, también las calculadas", async () => {
    const { onMoveDate } = renderSheet("vfx")

    await userEvent.click(screen.getByRole("button", { name: "Inicio de VFX" }))
    await userEvent.click(screen.getByRole("button", { name: /1 de agosto de 2027/ }))

    expect(onMoveDate).toHaveBeenCalledWith("vfx", "start", "2027-08-01")
  })

  it("se puede fijar el fin a otro elemento y quitar la regla de inicio", async () => {
    const { onSetRule, onRemoveRule } = renderSheet("vfx")

    await userEvent.click(screen.getByRole("button", { name: "Fijar el fin a otro elemento" }))
    const pickers = screen.getAllByRole("button", { name: "De qué elemento" })
    await userEvent.click(pickers[1]!)
    await userEvent.click(screen.getByRole("option", { name: "Edición" }))
    expect(onSetRule).toHaveBeenLastCalledWith("vfx", "end", {
      predecessorId: "edicion",
      predecessorPoint: "end",
      lag: { amount: 0, unit: "days" },
    })

    await userEvent.click(screen.getAllByRole("button", { name: "Quitar la regla" })[0]!)
    expect(onRemoveRule).toHaveBeenCalledWith("vfx", "start")
  })

  it("«Si cambia, mueve» lista lo que depende de él y salta a ello", async () => {
    const { onOpen } = renderSheet("vfx")

    const dependents = screen.getByRole("region", { name: "Si cambia, mueve" })
    await userEvent.click(within(dependents).getByRole("button", { name: /Creación VFX/ }))
    expect(onOpen).toHaveBeenCalledWith("creacion")
  })

  it("un miembro lee la regla pero no la edita", () => {
    renderSheet("vfx", false)

    expect(screen.getByText("4 semanas")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "De qué elemento" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Quitar la regla" })).toBeNull()
  })

  it("el contador suma una unidad y cambiar de unidad conserva lo que dura", async () => {
    const { onUpdate } = renderSheet("vfx")

    await userEvent.click(screen.getByRole("button", { name: "Una unidad más" }))
    expect(onUpdate).toHaveBeenLastCalledWith("vfx", { duration: { amount: 6, unit: "weeks" } })

    // Del 25 jul al 28 ago son 35 días: en días, 35.
    await userEvent.click(screen.getByRole("radio", { name: "días" }))
    expect(onUpdate).toHaveBeenLastCalledWith("vfx", { duration: { amount: 35, unit: "days" } })
  })

  it("la barra sitúa una fase dentro del plan entero", () => {
    renderSheet("post", true, { start: "2026-01-01", end: "2027-10-31" })

    expect(screen.getByText("Plan · 1 ene 2026")).toBeInTheDocument()
    expect(screen.getByText("31 oct 2027")).toBeInTheDocument()
  })

  it("sin duración, ofrece las habituales a un clic", async () => {
    const { onUpdate } = renderSheet("creacion")

    const suggestions = screen.getByRole("group", { name: "¿Cuánto dura?" })
    await userEvent.click(within(suggestions).getByRole("button", { name: "2 semanas" }))

    expect(onUpdate).toHaveBeenCalledWith("creacion", { duration: { amount: 2, unit: "weeks" } })
    expect(
      within(suggestions).getByRole("button", { name: /Duración de Creación VFX/ })
    ).toHaveTextContent("otra…")
  })
})
