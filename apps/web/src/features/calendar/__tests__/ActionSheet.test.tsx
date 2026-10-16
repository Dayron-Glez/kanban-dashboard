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
