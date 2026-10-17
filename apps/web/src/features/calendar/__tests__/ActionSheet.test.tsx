import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { DEFAULT_ELEMENT_DETAILS, NO_PEOPLE, type CalendarElement } from "@repo/contracts"
import { describe, expect, it, vi } from "vitest"
import { createFakeApi, createWrapper } from "@/shared/api/testing"
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

const MARTA = "6b0f1c2d-3e4f-4a5b-8c6d-7e8f9a0b1c2d"
const PEDRO = "7c1a2b3c-4d5e-4f6a-9b7c-8d9e0f1a2b3c"
const crewMember = (id: string, fullName: string) => ({
  id,
  projectId: "p",
  fullName,
  email: null,
  departmentId: null,
})

// El equipo del proyecto, desde un api falso.
const withApi = () => {
  const api = createFakeApi()
  api.crew.listByProject.mockResolvedValue([
    crewMember(MARTA, "Marta Ruiz"),
    crewMember(PEDRO, "Pedro Gil"),
  ])
  api.departments.listByProject.mockResolvedValue([])
  return { api, wrapper: createWrapper(api) }
}

const renderSheet = (request: Partial<NewActionRequest> = {}) => {
  const onCreate = vi.fn()
  const { api, wrapper } = withApi()
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
      onCancel={() => {}}
    />,
    { wrapper }
  )
  return { api, onCreate, form: () => screen.getByRole("form") }
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

  it("en «Cuándo», elegir el tramo ya lo aplica, sin Aplicar", async () => {
    const { onCreate, form } = renderSheet({ kind: "event", endsOn: "2027-04-14" })
    await userEvent.type(within(form()).getByRole("textbox", { name: /Título/ }), "Casting")
    await userEvent.click(within(form()).getByRole("button", { name: /^Cuándo:/ }))
    expect(screen.queryByRole("button", { name: "Aplicar" })).toBeNull()
    const day = (iso: string) => document.querySelector(`[data-day="${iso}"] button`) as HTMLElement
    await userEvent.click(day("2027-04-20"))
    await userEvent.click(day("2027-04-22"))
    expect(
      within(form()).getByRole("button", { name: /20 abr → jue 22 abr 2027/ })
    ).toBeInTheDocument()

    await userEvent.click(within(form()).getByRole("button", { name: "Crear evento" }))
    await waitFor(() =>
      expect(onCreate).toHaveBeenCalledWith(
        expect.objectContaining({ startsOn: "2027-04-20", endsOn: "2027-04-22" }),
        expect.anything()
      )
    )
  })

  const pick = async (field: string, option: string | RegExp) => {
    await userEvent.click(screen.getByRole("button", { name: field }))
    await userEvent.click(await screen.findByRole("option", { name: option }))
  }

  it("personas: responsable y ejecutante del equipo y un participante de fuera", async () => {
    const { onCreate, form } = renderSheet()
    await userEvent.type(within(form()).getByRole("textbox", { name: /Título/ }), "Producción")
    await userEvent.click(within(form()).getByRole("button", { name: /Personas/ }))
    await pick("Responsable", /Marta Ruiz/)
    await pick("Ejecutantes", /Pedro Gil/)
    await pick("Participantes", "Invitar a alguien de fuera…")
    await userEvent.type(screen.getByRole("textbox", { name: /Nombre/ }), "José Ruiz")
    await userEvent.type(screen.getByRole("textbox", { name: /Email/ }), "jose@agencia.es")
    await userEvent.click(screen.getByRole("button", { name: "Invitar" }))
    expect(within(form()).getByRole("button", { name: "Quitar a José Ruiz" })).toBeInTheDocument()

    await userEvent.click(within(form()).getByRole("button", { name: "Crear reunión" }))
    await waitFor(() =>
      expect(onCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          people: {
            responsibleId: MARTA,
            executorIds: [PEDRO],
            departmentIds: [],
            guests: [{ crewMemberId: null, fullName: "José Ruiz", email: "jose@agencia.es" }],
          },
        }),
        expect.anything()
      )
    )
  })

  it("desde el buscador se añade a alguien al equipo y queda asignado", async () => {
    const { api, form } = renderSheet()
    api.crew.create.mockResolvedValue(
      crewMember("8d2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d", "Lola Flores")
    )
    await userEvent.click(within(form()).getByRole("button", { name: /Personas/ }))
    await userEvent.click(screen.getByRole("button", { name: "Ejecutantes" }))
    await userEvent.type(await screen.findByPlaceholderText("Buscar…"), "Lola Flores")
    await userEvent.click(screen.getByRole("option", { name: "Añadir «Lola Flores» al equipo…" }))
    expect(screen.getByRole("textbox", { name: /Nombre/ })).toHaveValue("Lola Flores")
    await userEvent.click(screen.getByRole("button", { name: "Añadir y asignar" }))

    expect(api.crew.create).toHaveBeenCalledWith("p", {
      fullName: "Lola Flores",
      email: null,
      departmentId: null,
    })
    expect(
      await within(form()).findByRole("button", { name: "Quitar a Lola Flores" })
    ).toBeInTheDocument()
  })

  it("el viaje no lleva personas: la sección se va y lo elegido se quita", async () => {
    const { form } = renderSheet()
    await userEvent.click(within(form()).getByRole("button", { name: /Personas/ }))
    await pick("Responsable", /Marta Ruiz/)
    await userEvent.click(within(form()).getByRole("radio", { name: "Viaje" }))
    expect(within(form()).queryByRole("button", { name: /Personas/ })).toBeNull()

    await userEvent.click(within(form()).getByRole("radio", { name: "Reunión" }))
    expect(within(form()).getByRole("button", { name: /Personas/ })).toHaveTextContent("Sin nadie")
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
    onCancel: vi.fn(),
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
    />,
    { wrapper: withApi().wrapper }
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

  it("en «Cuándo», su sitio dentro de lo que cuelga", () => {
    renderEdit(meeting)
    expect(screen.getByText("Rodaje · 5 abr 2027")).toBeInTheDocument()
    expect(screen.getByText("16 may 2027")).toBeInTheDocument()
  })

  it("las personas se guardan enteras, y en el resumen se ve quién está", async () => {
    const { onDraftChange } = renderEdit({
      ...meeting,
      people: { ...NO_PEOPLE, responsibleId: MARTA, executorIds: [PEDRO] },
    })
    const fold = await screen.findByRole("button", { name: /Personas/ })
    await waitFor(() => expect(fold).toHaveTextContent("Marta Ruiz · 1 ejecutante"))
    await userEvent.click(fold)
    await userEvent.click(screen.getByRole("button", { name: "Quitar a Marta Ruiz" }))
    expect(onDraftChange).toHaveBeenLastCalledWith({
      people: { ...NO_PEOPLE, executorIds: [PEDRO] },
    })
  })

  it("una tarea de varios días que pasa a recordatorio se queda en un día", async () => {
    const { onDraftChange } = renderEdit(task)
    await userEvent.click(screen.getByRole("radio", { name: "Recordatorio" }))
    expect(onDraftChange).toHaveBeenLastCalledWith({
      kind: "reminder",
      duration: { amount: 1, unit: "days" },
    })
  })

  it("Cancelar se pulsa también sin cambios, y Borrar pide que se borre (la confirmación va fuera)", async () => {
    const { onCancel, onDelete } = renderEdit(task)
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(onCancel).toHaveBeenCalled()
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
