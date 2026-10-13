import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type {
  CalendarElement,
  CalendarPlan,
  ElementDependency,
  ProjectSummary,
} from "@repo/contracts"
import { MemoryRouter, Route, Routes } from "react-router"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createFakeApi, createWrapper } from "@/shared/api/testing"
import { CalendarPhasesPage } from "../components/CalendarPhasesPage"

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const PROJECT_ID = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b"

const element = (
  id: string,
  parentId: string | null,
  name: string,
  overrides: Partial<CalendarElement> = {}
): CalendarElement => ({
  id,
  projectId: PROJECT_ID,
  kind: parentId ? "subphase" : "phase",
  parentId,
  position: 0,
  name,
  color: parentId ? null : "#819DDA",
  templateKey: null,
  duration: null,
  startsOn: null,
  endsOn: null,
  isAnchor: false,
  isPinned: false,
  issue: null,
  ...overrides,
})

const planOf = (elements: CalendarElement[], dependencies: ElementDependency[] = []) =>
  ({ elements, dependencies }) satisfies CalendarPlan

const summary = (role: ProjectSummary["role"]): ProjectSummary => ({
  id: PROJECT_ID,
  ownerId: "o",
  kind: "film",
  name: "Largometraje",
  description: null,
  color: "#ef4444",
  createdAt: "2026-10-11T10:00:00.000Z",
  role,
  isFavorite: false,
  taskCount: 0,
})

const rodaje = (overrides: Partial<CalendarElement> = {}) =>
  element("rodaje", null, "Rodaje", { templateKey: "rodaje", isAnchor: true, ...overrides })

const preparacion = (overrides: Partial<CalendarElement> = {}) =>
  element("preparacion", null, "Preparación", { templateKey: "preparacion", ...overrides })

const preparacionAntesDelRodaje: ElementDependency = {
  id: "d1",
  predecessorId: "rodaje",
  predecessorPoint: "start",
  successorId: "preparacion",
  successorPoint: "end",
  lag: { amount: -1, unit: "days" },
}

let api: ReturnType<typeof createFakeApi>

const renderPage = (search = "") => {
  const Wrapper = createWrapper(api)
  render(
    <Wrapper>
      <MemoryRouter initialEntries={[`/projects/${PROJECT_ID}/calendar${search}`]}>
        <Routes>
          <Route path="/projects/:id/calendar" element={<CalendarPhasesPage />} />
        </Routes>
      </MemoryRouter>
    </Wrapper>
  )
}

const rowOf = (name: string) => screen.getByText(name).closest("li")!

beforeEach(() => {
  vi.mocked(toast.success).mockClear()
  api = createFakeApi()
  api.projects.listMine.mockResolvedValue([summary("owner")])
})

describe("CalendarPhasesPage", () => {
  it("todo empieza plegado; se despliega fase a fase o todo de una vez", async () => {
    api.elements.getPlan.mockResolvedValue(
      planOf([
        element("post", null, "Postproducción"),
        element("vfx", "post", "VFX"),
        element("creacion", "vfx", "Creación VFX"),
      ])
    )
    renderPage()

    await screen.findByText("Postproducción")
    expect(screen.queryByText("VFX")).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Desplegar Postproducción" }))
    expect(screen.getByText("VFX")).toBeInTheDocument()
    expect(screen.queryByText("Creación VFX")).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Plegar todo" }))
    expect(screen.queryByText("VFX")).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Desplegar todo" }))
    expect(screen.getByText("Creación VFX")).toBeInTheDocument()
  })

  it("enseña fechas, duración y la regla de cada elemento", async () => {
    api.elements.getPlan.mockResolvedValue(
      planOf(
        [
          rodaje({
            duration: { amount: 6, unit: "weeks" },
            startsOn: "2027-04-05",
            endsOn: "2027-05-16",
          }),
          preparacion({
            duration: { amount: 9, unit: "weeks" },
            startsOn: "2027-02-01",
            endsOn: "2027-04-04",
          }),
        ],
        [preparacionAntesDelRodaje]
      )
    )
    renderPage("?vista=tabla")

    const row = within(await screen.findByText("Preparación").then((node) => node.closest("li")!))
    expect(row.getByText("Antes del inicio de Rodaje")).toBeInTheDocument()
    expect(row.getByText("9 semanas")).toBeInTheDocument()
    expect(row.getByText("1 feb 2027")).toBeInTheDocument()
    expect(row.getByText("4 abr 2027")).toBeInTheDocument()
    expect(within(rowOf("Rodaje")).getByText("clave")).toBeInTheDocument()
  })

  it("por defecto enseña el cronograma: cada elemento con su barra, y se puede pasar a la tabla", async () => {
    api.elements.getPlan.mockResolvedValue(
      planOf(
        [
          rodaje({
            duration: { amount: 6, unit: "weeks" },
            startsOn: "2027-04-05",
            endsOn: "2027-05-16",
          }),
          preparacion({ startsOn: "2027-02-01" }),
        ],
        [preparacionAntesDelRodaje]
      )
    )
    renderPage()

    expect(
      await screen.findByRole("button", { name: "Rodaje: 5 abr 2027 → 16 may 2027" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Preparación: 1 feb 2027, sin fin" })
    ).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "Ambos" })).toHaveAttribute("aria-checked", "true")

    await userEvent.click(screen.getByRole("radio", { name: "Tabla" }))
    expect(screen.queryByRole("button", { name: /Rodaje: 5 abr/ })).toBeNull()
    expect(screen.getByRole("button", { name: "Inicio de Rodaje" })).toBeInTheDocument()
    expect(screen.queryByRole("radiogroup", { name: "Escala" })).toBeNull()
  })

  it("si falta una fecha, dice por qué al pasar por encima", async () => {
    api.elements.getPlan.mockResolvedValue(
      planOf(
        [
          rodaje({ issue: { code: "missing-date" } }),
          preparacion({ issue: { code: "missing-dependency", elementId: "rodaje" } }),
        ],
        [preparacionAntesDelRodaje]
      )
    )
    renderPage("?vista=tabla")

    expect(await screen.findByRole("button", { name: "Inicio de Preparación" })).toHaveAttribute(
      "title",
      "Falta la fecha de Rodaje"
    )
  })

  it("la propietaria escribe una duración y ve el plan recalculado", async () => {
    api.elements.getPlan.mockResolvedValue(planOf([rodaje(), preparacion()]))
    api.elements.updatePlan.mockResolvedValue(
      planOf([rodaje(), preparacion({ duration: { amount: 9, unit: "weeks" } })])
    )
    renderPage()

    await userEvent.click(
      within(await screen.findByRole("treeitem", { name: /Preparación/ })).getByRole("button", {
        name: "Duración de Preparación",
      })
    )
    await userEvent.type(screen.getByLabelText("Cantidad"), "9")
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }))

    expect(api.elements.updatePlan).toHaveBeenCalledWith("preparacion", {
      duration: { amount: 9, unit: "weeks" },
    })
    expect(await within(rowOf("Preparación")).findByText("9 semanas")).toBeInTheDocument()
  })

  it("si un cambio mueve otras fechas, lo enseña antes y solo guarda al confirmar", async () => {
    const softpre = element("softpre", null, "SoftPre", {
      templateKey: "softpre",
      duration: { amount: 17, unit: "weeks" },
      startsOn: "2026-10-12",
      endsOn: "2027-02-07",
    })
    const datedPlan = planOf(
      [
        softpre,
        preparacion({
          duration: { amount: 8, unit: "weeks" },
          startsOn: "2027-02-08",
          endsOn: "2027-04-04",
        }),
        rodaje({
          duration: { amount: 6, unit: "weeks" },
          startsOn: "2027-04-05",
          endsOn: "2027-05-16",
        }),
      ],
      [
        preparacionAntesDelRodaje,
        {
          id: "d2",
          predecessorId: "preparacion",
          predecessorPoint: "start",
          successorId: "softpre",
          successorPoint: "end",
          lag: { amount: -1, unit: "days" },
        },
      ]
    )
    api.elements.getPlan.mockResolvedValue(datedPlan)
    api.elements.updatePlan.mockResolvedValue(datedPlan)
    renderPage()

    const changeDuration = async () => {
      await userEvent.click(await screen.findByRole("button", { name: "Duración de Preparación" }))
      const amount = screen.getByLabelText("Cantidad")
      await userEvent.clear(amount)
      await userEvent.type(amount, "9")
      await userEvent.click(screen.getByRole("button", { name: "Guardar" }))
    }

    await changeDuration()
    const dialog = await screen.findByRole("alertdialog", {
      name: "Cambiar la duración de Preparación",
    })
    expect(dialog).toHaveTextContent("−1 semana para 1 elemento")
    expect(within(dialog).getByText("SoftPre")).toBeInTheDocument()
    expect(within(dialog).getByRole("button", { name: "Cancelar" })).toHaveFocus()
    await userEvent.click(within(dialog).getByRole("button", { name: "Ver las 1 fechas" }))
    expect(within(dialog).getByRole("cell", { name: "SoftPre" })).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }))
    expect(api.elements.updatePlan).not.toHaveBeenCalled()

    await changeDuration()
    await userEvent.click(await screen.findByRole("button", { name: "Aplicar" }))
    expect(api.elements.updatePlan).toHaveBeenCalledWith("preparacion", {
      duration: { amount: 9, unit: "weeks" },
    })

    // Tras guardar, el aviso ofrece deshacer: vuelve a la duración de antes.
    const [, options] = vi.mocked(toast.success).mock.calls.at(-1)!
    const undo = (options as unknown as { action: { onClick: () => void } }).action
    undo.onClick()
    await waitFor(() =>
      expect(api.elements.updatePlan).toHaveBeenLastCalledWith("preparacion", {
        duration: { amount: 8, unit: "weeks" },
      })
    )
  })

  it("las barras se mueven con las flechas: un día, una semana con Mayús, solo el fin con Alt", async () => {
    const plan = planOf([
      rodaje({
        duration: { amount: 6, unit: "weeks" },
        startsOn: "2027-04-05",
        endsOn: "2027-05-16",
      }),
    ])
    api.elements.getPlan.mockResolvedValue(plan)
    api.elements.updatePlan.mockResolvedValue(plan)
    renderPage()

    const bar = await screen.findByRole("button", { name: "Rodaje: 5 abr 2027 → 16 may 2027" })
    bar.focus()
    await userEvent.keyboard("{Shift>}{ArrowRight}{/Shift}")
    expect(api.elements.updatePlan).toHaveBeenLastCalledWith("rodaje", { fixedStart: "2027-04-12" })

    await userEvent.keyboard("{Alt>}{ArrowLeft}{/Alt}")
    expect(api.elements.updatePlan).toHaveBeenLastCalledWith("rodaje", {
      duration: { amount: 41, unit: "days" },
    })
  })

  it("arrastrar una barra la mueve a la semana más cercana, y soltar sin moverla la abre", async () => {
    const plan = planOf([
      rodaje({
        duration: { amount: 6, unit: "weeks" },
        startsOn: "2027-04-05",
        endsOn: "2027-05-16",
      }),
    ])
    api.elements.getPlan.mockResolvedValue(plan)
    api.elements.updatePlan.mockResolvedValue(plan)
    renderPage()

    const bar = await screen.findByRole("button", { name: "Rodaje: 5 abr 2027 → 16 may 2027" })
    // En «meses» un día mide 2 px: 30 px son 15 días, que se ajustan a 2 semanas.
    fireEvent.pointerDown(bar, { button: 0, clientX: 100, pointerId: 1 })
    fireEvent.pointerMove(bar, { clientX: 130, pointerId: 1 })
    fireEvent.pointerUp(bar, { clientX: 130, pointerId: 1 })
    // El clic que sigue a soltar no abre el inspector; un clic sin arrastrar, sí.
    fireEvent.click(bar)
    await waitFor(() =>
      expect(api.elements.updatePlan).toHaveBeenLastCalledWith("rodaje", {
        fixedStart: "2027-04-19",
      })
    )
    expect(screen.queryByRole("heading", { name: "Rodaje" })).toBeNull()
    fireEvent.click(bar)
    expect(screen.getByRole("heading", { name: "Rodaje" })).toBeInTheDocument()
  })

  it("lo que cuelga de otros por sus dos fechas no se arrastra, y lo dice", async () => {
    api.elements.getPlan.mockResolvedValue(
      planOf(
        [
          rodaje({
            duration: { amount: 6, unit: "weeks" },
            startsOn: "2027-04-05",
            endsOn: "2027-05-16",
          }),
          element("shooting", "rodaje", "Shooting", {
            startsOn: "2027-04-05",
            endsOn: "2027-05-16",
          }),
        ],
        [
          {
            id: "s1",
            predecessorId: "rodaje",
            predecessorPoint: "start",
            successorId: "shooting",
            successorPoint: "start",
            lag: { amount: 0, unit: "days" },
          },
          {
            id: "s2",
            predecessorId: "rodaje",
            predecessorPoint: "end",
            successorId: "shooting",
            successorPoint: "end",
            lag: { amount: 0, unit: "days" },
          },
        ]
      )
    )
    renderPage()

    await userEvent.click(await screen.findByRole("button", { name: "Desplegar Rodaje" }))
    const bar = screen.getByRole("button", { name: "Shooting: 5 abr 2027 → 16 may 2027" })
    expect(bar).toHaveAttribute("title", expect.stringContaining("Se mueve con Rodaje"))
    bar.focus()
    await userEvent.keyboard("{ArrowRight}")
    expect(api.elements.updatePlan).not.toHaveBeenCalled()
  })

  it("la cabecera resume el plan y los pasos marcan lo hecho", async () => {
    api.elements.getPlan.mockResolvedValue(
      planOf([
        rodaje({
          duration: { amount: 6, unit: "weeks" },
          startsOn: "2027-04-05",
          endsOn: "2027-05-16",
        }),
        preparacion({ startsOn: "2027-02-01" }),
      ])
    )
    renderPage()

    expect(await screen.findByText("Rodaje · 5 abr 2027")).toBeInTheDocument()
    expect(screen.getByText("1 fase sin duración")).toBeInTheDocument()
    const setup = screen.getByRole("region", { name: "Para que el plan salga solo" })
    expect(within(setup).getByText("2 de 3")).toBeInTheDocument()
  })

  it("el bloque «Para que el plan salga solo» pide lo que falta y se va cuando está todo", async () => {
    api.elements.getPlan.mockResolvedValue(planOf([rodaje(), preparacion()]))
    renderPage()

    const setup = await screen.findByRole("region", { name: "Para que el plan salga solo" })
    expect(within(setup).getByText("Fecha de inicio de Rodaje")).toBeInTheDocument()
    expect(within(setup).getByText("Duración de Preparación")).toBeInTheDocument()
  })

  it("sin nada pendiente, no hay bloque", async () => {
    const written = { duration: { amount: 1, unit: "weeks" as const }, startsOn: "2027-04-05" }
    api.elements.getPlan.mockResolvedValue(planOf([rodaje(written), preparacion(written)]))
    renderPage()

    await screen.findByText("Preparación")
    expect(screen.queryByRole("region", { name: "Para que el plan salga solo" })).toBeNull()
  })

  it("un miembro ve el plan pero no puede editarlo", async () => {
    api.projects.listMine.mockResolvedValue([summary("member")])
    api.elements.getPlan.mockResolvedValue(
      planOf([rodaje({ duration: { amount: 6, unit: "weeks" } }), preparacion()])
    )
    renderPage()

    expect(await screen.findByText("6 semanas")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Duración de/ })).toBeNull()
    expect(screen.queryByRole("region", { name: "Para que el plan salga solo" })).toBeNull()
  })

  it("el inspector se acopla al lado, se recorre con ↑ ↓ y se cierra con Esc", async () => {
    api.elements.getPlan.mockResolvedValue(planOf([rodaje(), preparacion()]))
    renderPage()

    await userEvent.click(await screen.findByRole("button", { name: "Ver el detalle de Rodaje" }))
    expect(screen.getByRole("dialog", { name: "Rodaje" })).toBeInTheDocument()

    await userEvent.keyboard("{ArrowDown}")
    expect(screen.getByRole("dialog", { name: "Preparación" })).toBeInTheDocument()

    await userEvent.keyboard("{Escape}")
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("la propietaria genera el calendario si está vacío", async () => {
    api.elements.getPlan.mockResolvedValueOnce(planOf([]))
    api.elements.getPlan.mockResolvedValue(planOf([element("dev", null, "Desarrollo")]))
    api.elements.generateFromTemplate.mockResolvedValue([element("dev", null, "Desarrollo")])
    renderPage()

    await userEvent.click(await screen.findByRole("button", { name: /Generar desde la plantilla/ }))

    expect(api.elements.generateFromTemplate).toHaveBeenCalledWith(PROJECT_ID)
    expect(await screen.findByText("Desarrollo")).toBeInTheDocument()
  })

  it("un miembro no ve el botón de generar", async () => {
    api.projects.listMine.mockResolvedValue([summary("member")])
    api.elements.getPlan.mockResolvedValue(planOf([]))
    renderPage()

    expect(await screen.findByText(/Solo el propietario/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Generar/ })).not.toBeInTheDocument()
  })
})
