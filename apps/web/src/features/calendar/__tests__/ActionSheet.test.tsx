import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { DEFAULT_ELEMENT_DETAILS, type CalendarElement } from "@repo/contracts"
import { describe, expect, it, vi } from "vitest"
import { ActionSheet } from "../forms/ActionSheet"
import type { NewActionRequest } from "../forms/actionForm"
import { buildElementTree } from "../lib/elementTree"

const element = (id: string, overrides: Partial<CalendarElement> = {}): CalendarElement => ({
  id,
  projectId: "p",
  kind: "phase",
  parentId: null,
  position: 0,
  name: "Rodaje",
  color: "#819DDA",
  templateKey: id,
  duration: { amount: 6, unit: "weeks" },
  startsOn: "2027-04-05",
  endsOn: "2027-05-16",
  isAnchor: false,
  isPinned: false,
  issue: null,
  ...DEFAULT_ELEMENT_DETAILS,
  ...overrides,
})

const plan = { elements: [element("rodaje")], dependencies: [] }

const renderSheet = (request: Partial<NewActionRequest> = {}) => {
  const onCreate = vi.fn()
  render(
    <ActionSheet
      mode="create"
      request={{
        parentId: "rodaje",
        kind: "meeting",
        startsOn: "2027-04-14",
        endsOn: null,
        ...request,
      }}
      projectId="p"
      plan={plan}
      tree={buildElementTree(plan.elements)}
      pending={false}
      onPreview={() => {}}
      onDirtyChange={() => {}}
      onClose={() => {}}
      onCreate={onCreate}
    />
  )
  return { onCreate, form: () => screen.getByRole("form") }
}

// Escriben bastante con userEvent: con toda la suite a la vez, pasan de 5 s.
describe("el Sheet de una acción nueva", { timeout: 15_000 }, () => {
  it("sin título no se crea, y el error sale junto al campo, en español", async () => {
    const { onCreate, form } = renderSheet()
    await userEvent.click(within(form()).getByRole("button", { name: "Crear reunión" }))
    expect(await within(form()).findByText("Hace falta rellenarlo")).toBeInTheDocument()
    expect(onCreate).not.toHaveBeenCalled()
  })

  it("las horas, con su error si el fin va antes del inicio", async () => {
    const { onCreate, form } = renderSheet()
    await userEvent.type(within(form()).getByRole("textbox", { name: /Título/ }), "Reunión")
    const end = within(form()).getByLabelText("Hasta")
    await userEvent.clear(end)
    await userEvent.type(end, "09:00")
    await userEvent.click(within(form()).getByRole("button", { name: "Crear reunión" }))
    expect(
      await within(form()).findByText("La hora de fin tiene que ser posterior a la de inicio")
    ).toBeInTheDocument()
    expect(onCreate).not.toHaveBeenCalled()
  })

  it("la videollamada solo en la reunión, y se crea con todo de una vez", async () => {
    const { onCreate, form } = renderSheet()
    await userEvent.type(within(form()).getByRole("textbox", { name: /Título/ }), "Producción")
    await userEvent.click(within(form()).getByRole("switch", { name: "Es una videollamada" }))
    await userEvent.type(
      within(form()).getByRole("textbox", { name: "Enlace" }),
      "https://meet.google.com/abc"
    )
    await userEvent.type(within(form()).getByRole("textbox", { name: "Ubicación" }), "Oficina")
    await userEvent.keyboard("{Control>}{Enter}{/Control}")

    await waitFor(() =>
      expect(onCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          parentId: "rodaje",
          kind: "meeting",
          name: "Producción",
          location: "Oficina",
          videoApp: "meet",
          videoUrl: "https://meet.google.com/abc",
        }),
        expect.anything()
      )
    )
  })

  it("al pasar a tarea, de todo el día y con «Hecha»; sin videollamada", async () => {
    const { form } = renderSheet()
    await userEvent.click(within(form()).getByRole("radio", { name: "Tarea" }))
    expect(within(form()).queryByText("Videollamada")).toBeNull()
    expect(within(form()).getByRole("switch", { name: "Todo el día" })).toBeChecked()
    expect(within(form()).getByRole("switch", { name: /Hecha/ })).not.toBeChecked()
    expect(screen.getByRole("heading", { name: "Nueva tarea" })).toBeInTheDocument()
  })
})

const meeting = element("lectura", {
  kind: "meeting",
  parentId: "rodaje",
  name: "Lectura de guion",
  color: null,
  duration: { amount: 1, unit: "days" },
  startsOn: "2027-04-14",
  endsOn: "2027-04-14",
  isPinned: true,
  hours: { allDay: false, startTime: "10:00", endTime: "11:00", hoursMode: null },
})
const task = element("montaje", {
  kind: "task",
  parentId: "rodaje",
  name: "Montaje de prueba",
  color: null,
  duration: { amount: 3, unit: "days" },
  startsOn: "2027-04-14",
  endsOn: "2027-04-16",
  isPinned: true,
})

const renderEdit = (action: CalendarElement, editable = true) => {
  const editPlan = { elements: [element("rodaje"), action], dependencies: [] }
  const handlers = {
    onDraftChange: vi.fn(),
    onResolveWhen: vi.fn(),
    onSave: vi.fn(),
    onDiscard: vi.fn(),
    onDelete: vi.fn(),
    onClose: vi.fn(),
  }
  render(
    <ActionSheet
      mode="edit"
      saved={action}
      shown={action}
      projectId="p"
      plan={editPlan}
      tree={buildElementTree(editPlan.elements)}
      editable={editable}
      pending={false}
      path="Rodaje › Reunión"
      resetKey={0}
      {...handlers}
    />
  )
  return handlers
}

describe("el Sheet de una acción guardada", { timeout: 15_000 }, () => {
  it("parte de lo guardado, sin cambios; cada cambio se cuenta y se guarda solo lo tocado", async () => {
    const { onSave, onDraftChange } = renderEdit(meeting)
    const form = screen.getByRole("form", { name: "Lectura de guion" })
    expect(within(form).getByText("Sin cambios")).toBeInTheDocument()
    expect(within(form).getByRole("button", { name: "Guardar" })).toBeDisabled()

    const title = within(form).getByRole("textbox", { name: /Título/ })
    await userEvent.clear(title)
    await userEvent.type(title, "Lectura general")
    await userEvent.type(within(form).getByRole("textbox", { name: "Ubicación" }), "Plató 2")
    expect(within(form).getByText("2 cambios sin guardar")).toBeInTheDocument()
    expect(onDraftChange).toHaveBeenLastCalledWith({
      name: "Lectura general",
      location: "Plató 2",
    })

    await userEvent.click(within(form).getByRole("button", { name: "Guardar" }))
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({ name: "Lectura general", location: "Plató 2" })
    )
  })

  it("una tarea de varios días que pasa a recordatorio se queda en un día", async () => {
    const { onDraftChange } = renderEdit(task)
    await userEvent.click(screen.getByRole("radio", { name: "Recordatorio" }))
    expect(onDraftChange).toHaveBeenLastCalledWith({
      kind: "reminder",
      duration: { amount: 1, unit: "days" },
    })
  })

  it("Cancelar descarta y Borrar pide que se borre (la confirmación va fuera)", async () => {
    const { onDiscard, onDelete } = renderEdit(task)
    await userEvent.click(screen.getByRole("switch", { name: /Hecha/ }))
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(onDiscard).toHaveBeenCalled()
    await userEvent.click(screen.getByRole("button", { name: "Borrar" }))
    expect(onDelete).toHaveBeenCalled()
  })

  it("quien no es propietario la ve, pero no la cambia", () => {
    renderEdit(meeting, false)
    expect(screen.getByRole("textbox", { name: /Título/ })).toBeDisabled()
    expect(screen.queryByRole("button", { name: "Guardar" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Borrar" })).toBeNull()
  })
})
