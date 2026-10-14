import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type {
  CalendarElement,
  CalendarPlan,
  ElementDependency,
  ProjectSummary,
} from "@repo/contracts"
import { fromIsoDate } from "@repo/domain"
import { MemoryRouter, Route, Routes } from "react-router"
import { toast } from "sonner"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createFakeApi, createWrapper } from "@/shared/api/testing"
import { CalendarPage } from "../components/CalendarPage"

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

// En el móvil no hay rejilla: el árbol con sus fechas.
const device = vi.hoisted(() => ({ mobile: false }))
vi.mock("@/shared/hooks/use-mobile", () => ({ useIsMobile: () => device.mobile }))

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
          <Route path="/projects/:id/calendar" element={<CalendarPage />} />
        </Routes>
      </MemoryRouter>
    </Wrapper>
  )
}

const rowOf = (name: string) => screen.getByText(name).closest("li")!

beforeEach(() => {
  device.mobile = false
  localStorage.clear()
  vi.mocked(toast.success).mockClear()
  api = createFakeApi()
  api.projects.listMine.mockResolvedValue([summary("owner")])
})

describe("CalendarPage", () => {
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
    device.mobile = true
    renderPage()

    const row = within(await screen.findByText("Preparación").then((node) => node.closest("li")!))
    expect(row.getByText("Antes del inicio de Rodaje")).toBeInTheDocument()
    expect(row.getByText("9 semanas")).toBeInTheDocument()
    expect(row.getByText("1 feb 2027")).toBeInTheDocument()
    expect(row.getByText("4 abr 2027")).toBeInTheDocument()
    expect(within(rowOf("Rodaje")).getByText("clave")).toBeInTheDocument()
  })

  it("cada elemento con su barra, y el selector ofrece las siete vistas del prototipo", async () => {
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
    expect(screen.getByRole("heading", { name: "Calendario" })).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Calendario: Gantt (día a día)" }))
    expect(screen.getAllByRole("menuitemradio")).toHaveLength(7)
    expect(screen.getByRole("menuitemradio", { name: /Gantt/ })).toHaveAttribute(
      "aria-checked",
      "true"
    )
    expect(screen.getByRole("menuitemradio", { name: /Mensual/ })).toHaveAttribute(
      "aria-disabled",
      "true"
    )
    expect(screen.getByRole("menuitemradio", { name: /Mensual/ })).toHaveTextContent(
      "Llega con las acciones"
    )
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
    device.mobile = true
    renderPage()

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

  it("arrastrar una barra la mueve al día más cercano, y soltar sin moverla la abre", async () => {
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
    // Un día mide 28 px: 200 px son 7,1 días, que se quedan en 7.
    fireEvent.pointerDown(bar, { button: 0, clientX: 100, pointerId: 1 })
    fireEvent.pointerMove(bar, { clientX: 300, pointerId: 1 })
    fireEvent.pointerUp(bar, { clientX: 300, pointerId: 1 })
    // El clic que sigue a soltar no abre el inspector; un clic sin arrastrar, sí.
    fireEvent.click(bar)
    await waitFor(() =>
      expect(api.elements.updatePlan).toHaveBeenLastCalledWith("rodaje", {
        fixedStart: "2027-04-12",
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

  describe("el orden de las fases", () => {
    // Preparación acaba el día antes de Rodaje (42 días) y Postproducción empieza
    // con él: Preparación puede meterse en Rodaje 10 días como mucho.
    const plan = planOf(
      [
        preparacion({
          position: 0,
          duration: { amount: 9, unit: "weeks" },
          startsOn: "2027-02-01",
          endsOn: "2027-04-04",
        }),
        rodaje({
          position: 1,
          duration: { amount: 6, unit: "weeks" },
          startsOn: "2027-04-05",
          endsOn: "2027-05-16",
        }),
        element("post", null, "Postproducción", {
          position: 2,
          duration: { amount: 30, unit: "weeks" },
          startsOn: "2027-04-05",
          endsOn: "2027-10-31",
        }),
      ],
      [
        preparacionAntesDelRodaje,
        {
          id: "d2",
          predecessorId: "rodaje",
          predecessorPoint: "start",
          successorId: "post",
          successorPoint: "start",
          lag: { amount: 0, unit: "days" },
        },
      ]
    )

    it("arrastrar más allá del tope se para en él y lo dice al guardar", async () => {
      api.elements.getPlan.mockResolvedValue(plan)
      api.elements.setRule.mockResolvedValue(plan)
      renderPage()

      const bar = await screen.findByRole("button", {
        name: "Preparación: 1 feb 2027 → 4 abr 2027",
      })
      // Un día mide 28 px: 784 px son 4 semanas, pero el tope está en 10 días.
      fireEvent.pointerDown(bar, { button: 0, clientX: 100, pointerId: 1 })
      fireEvent.pointerMove(bar, { clientX: 884, pointerId: 1 })
      expect(screen.getByText(/tope: 25 % de solape/)).toBeInTheDocument()
      fireEvent.pointerUp(bar, { clientX: 884, pointerId: 1 })

      await waitFor(() =>
        expect(api.elements.setRule).toHaveBeenCalledWith("preparacion", "end", {
          predecessorId: "rodaje",
          predecessorPoint: "start",
          lag: { amount: 9, unit: "days" },
        })
      )
      const [title, options] = vi.mocked(toast.success).mock.calls.at(-1)!
      expect(title).toBe("Cambio guardado")
      expect((options as { description?: string }).description).toBe(
        "Ajustado al 14 abr 2027: Preparación se metería un 27 % en Rodaje; el máximo es un 25 %."
      )
    })

    it("un cambio que no se puede ajustar no se envía, y dice por qué", async () => {
      api.elements.getPlan.mockResolvedValue(plan)
      device.mobile = true
      renderPage()

      await userEvent.click(
        await screen.findByRole("button", { name: "Duración de Postproducción" })
      )
      const amount = screen.getByLabelText("Cantidad")
      await userEvent.clear(amount)
      await userEvent.type(amount, "10")
      await userEvent.click(screen.getByRole("button", { name: "Guardar" }))

      expect(api.elements.updatePlan).not.toHaveBeenCalled()
      expect(toast.error).toHaveBeenCalledWith("No se puede guardar el cambio", {
        id: "plan-change",
        description: "Rodaje se metería un 60 % en Postproducción; el máximo es un 25 %",
      })
    })
  })

  describe("el foco en hoy", () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 9, 13) })
      Element.prototype.scrollTo = vi.fn()
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    // La rejilla empieza el lunes 12 de octubre de 2026: hoy es su segundo día.
    const leftOf = (iso: string) => (fromIsoDate(iso) - fromIsoDate("2026-10-12")) * 28 + 14

    it("al abrir se centra en hoy, y «Hoy» e «Ir a fecha» llevan a donde se pide", async () => {
      api.elements.getPlan.mockResolvedValue(
        planOf([
          rodaje({
            duration: { amount: 6, unit: "weeks" },
            startsOn: "2027-04-05",
            endsOn: "2027-05-16",
          }),
        ])
      )
      renderPage()

      await screen.findByRole("button", { name: "Rodaje: 5 abr 2027 → 16 may 2027" })
      const scrollTo = vi.mocked(Element.prototype.scrollTo)
      await waitFor(() =>
        expect(scrollTo).toHaveBeenCalledWith({ left: leftOf("2026-10-13"), behavior: "auto" })
      )

      await userEvent.click(screen.getByRole("button", { name: "Ir a fecha" }))
      await userEvent.click(screen.getByRole("button", { name: "Inicio de Rodaje" }))
      expect(scrollTo).toHaveBeenLastCalledWith({ left: leftOf("2027-04-05"), behavior: "smooth" })

      await userEvent.click(screen.getByRole("button", { name: "Hoy" }))
      expect(scrollTo).toHaveBeenLastCalledWith({ left: leftOf("2026-10-13"), behavior: "smooth" })
    })
  })

  it("en el menú «Vista» se añaden columnas junto al Gantt, y se recuerda", async () => {
    api.elements.getPlan.mockResolvedValue(
      planOf([rodaje({ startsOn: "2027-04-05", endsOn: "2027-05-16" })])
    )
    renderPage()

    await screen.findByRole("button", { name: "Rodaje: 5 abr 2027 → 16 may 2027" })
    expect(screen.queryByRole("button", { name: "Inicio de Rodaje" })).toBeNull()

    await userEvent.click(screen.getByRole("button", { name: "Vista" }))
    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "Inicio" }))
    expect(screen.getByRole("menuitemcheckbox", { name: "Inicio" })).toHaveAttribute(
      "aria-checked",
      "true"
    )
    await userEvent.keyboard("{Escape}")
    expect(screen.getByRole("button", { name: "Inicio de Rodaje" })).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem("cauce.gantt.campos")!)).toMatchObject({ start: true })
  })

  it("la leyenda, en una línea, explica el Gantt; se oculta entera o por partes, y se recuerda", async () => {
    api.elements.getPlan.mockResolvedValue(
      planOf([rodaje({ startsOn: "2027-04-05", endsOn: "2027-05-16" })])
    )
    renderPage()

    const legend = await screen.findByRole("note", { name: "Leyenda" })
    expect(within(legend).getByText("Hoy")).toBeInTheDocument()
    expect(within(legend).getByText("Subfase o proceso")).toBeInTheDocument()
    // Las explicaciones largas, en el tooltip.
    await userEvent.hover(within(legend).getByText("Semana 1"))
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "La semana en la que empieza el rodaje: de ahí se cuentan las demás"
    )
    await userEvent.unhover(within(legend).getByText("Semana 1"))

    // Las partes y la propia leyenda se eligen en el menú «Vista».
    await userEvent.click(screen.getByRole("button", { name: "Vista" }))
    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "Hoy (y su línea)" }))
    expect(within(legend).queryByText("Hoy")).toBeNull()
    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "Mostrar la leyenda" }))
    await userEvent.keyboard("{Escape}")
    expect(screen.queryByRole("note", { name: "Leyenda" })).toBeNull()
    expect(JSON.parse(localStorage.getItem("cauce.gantt.leyenda")!)).toMatchObject({
      visible: false,
      today: false,
    })
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

    await screen.findByRole("button", { name: "Ver el detalle de Preparación" })
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
