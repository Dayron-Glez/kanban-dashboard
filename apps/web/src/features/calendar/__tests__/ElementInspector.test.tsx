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

const openRules = () =>
  userEvent.click(screen.getByRole("button", { name: "Cambiar de qué depende" }))

describe("ElementInspector", () => {
  it("enseña las fechas, de dónde cuelga y cómo se calcula", async () => {
    renderSheet("vfx")

    expect(screen.getByText("−4 semanas fin de Edición")).toBeInTheDocument()
    await openRules()

    expect(screen.getByRole("heading", { name: "VFX" })).toBeInTheDocument()
    expect(screen.getByText("Postproducción › Subfase")).toBeInTheDocument()
    expect(screen.getByText("dom 25 jul 2027")).toBeInTheDocument()
    expect(screen.getByLabelText("Desfase")).toHaveValue("-4")
    expect(screen.getByRole("combobox", { name: "Unidad del desfase" })).toHaveTextContent(
      "semanas"
    )
    expect(screen.getByRole("combobox", { name: "Desde qué fecha" })).toHaveTextContent("el fin")
    expect(screen.getByRole("combobox", { name: "De qué elemento" })).toHaveTextContent("Edición")
  })

  it("guardar la regla manda el desfase nuevo, con coma decimal", async () => {
    const { onSetRule } = renderSheet("vfx")
    await openRules()

    const lag = screen.getByLabelText("Desfase")
    await userEvent.clear(lag)
    await userEvent.type(lag, "-3,5")
    await userEvent.click(screen.getByRole("button", { name: "Guardar la regla" }))

    expect(onSetRule).toHaveBeenCalledWith("vfx", "start", {
      predecessorId: "edicion",
      predecessorPoint: "end",
      lag: { amount: -3.5, unit: "weeks" },
    })
  })

  it("no ofrece depender de uno mismo ni de lo que cuelga de él", async () => {
    renderSheet("vfx")
    await openRules()

    await userEvent.click(screen.getByRole("combobox", { name: "De qué elemento" }))
    const options = screen.getAllByRole("option").map((option) => option.textContent)

    expect(options).toEqual(["Postproducción", "Edición"])
  })

  it("elegir otra fecha de referencia y otro elemento cambia la regla que se guarda", async () => {
    const { onSetRule } = renderSheet("vfx")
    await openRules()

    await userEvent.click(screen.getByRole("combobox", { name: "Desde qué fecha" }))
    await userEvent.click(screen.getByRole("option", { name: "el inicio" }))
    await userEvent.click(screen.getByRole("combobox", { name: "De qué elemento" }))
    await userEvent.click(screen.getByRole("option", { name: "Postproducción" }))
    await userEvent.click(screen.getByRole("button", { name: "Guardar la regla" }))

    expect(onSetRule).toHaveBeenCalledWith("vfx", "start", {
      predecessorId: "post",
      predecessorPoint: "start",
      lag: { amount: -4, unit: "weeks" },
    })
  })

  it("el ancla no tiene regla que cambiar: su fecha se escribe a mano", () => {
    renderSheet("post")

    expect(screen.getByText(/Es la fecha clave/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Cambiar de qué depende" })).toBeNull()
  })

  it("las fechas se escriben directamente, también las calculadas", async () => {
    const { onMoveDate } = renderSheet("vfx")

    await userEvent.click(screen.getByRole("button", { name: "Inicio de VFX" }))
    await userEvent.click(screen.getByRole("button", { name: /1 de agosto de 2027/ }))

    expect(onMoveDate).toHaveBeenCalledWith("vfx", "start", "2027-08-01")
  })

  it("se puede añadir una regla de fin y quitar la de inicio", async () => {
    const { onRemoveRule } = renderSheet("vfx")
    await openRules()
    const end = screen.getByRole("heading", { name: "Cuándo acaba" }).parentElement!

    await userEvent.click(within(end).getByRole("button", { name: "Añadir regla de fin" }))
    expect(within(end).getByRole("button", { name: "Guardar la regla" })).toBeInTheDocument()

    const start = screen.getByRole("heading", { name: "Cuándo empieza" }).parentElement!
    await userEvent.click(within(start).getByRole("button", { name: "Quitar la regla" }))
    expect(onRemoveRule).toHaveBeenCalledWith("vfx", "start")
  })

  it("un miembro lee la regla pero no la edita", () => {
    renderSheet("vfx", false)

    expect(screen.getByText("−4 semanas fin de Edición")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /regla/ })).toBeNull()
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
})
