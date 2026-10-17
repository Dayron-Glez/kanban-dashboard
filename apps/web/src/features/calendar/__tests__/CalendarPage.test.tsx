import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  DEFAULT_ELEMENT_DETAILS,
  type CalendarElement,
  type CalendarPlan,
  type ElementDependency,
  type ProjectSummary,
} from "@repo/contracts"
import { fromIsoDate } from "@repo/domain"
import { MemoryRouter, Route, Routes } from "react-router"
import { toast } from "sonner"
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from "vitest"
import { createFakeApi, createWrapper } from "@/shared/api/testing"
import { CalendarPage } from "../components/CalendarPage"
import { DEFAULT_GANTT_FIELDS, saveGanttFields } from "../lib/ganttFields"

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
  ...DEFAULT_ELEMENT_DETAILS,
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
  // cmdk (el buscador de «Cuelga de») desplaza la opción activa a la vista.
  Element.prototype.scrollIntoView ??= () => {}
  device.mobile = false
  localStorage.clear()
  vi.mocked(toast.success).mockClear()
  vi.mocked(toast.error).mockClear()
  api = createFakeApi()
  api.projects.listMine.mockResolvedValue([summary("owner")])
  api.crew.listByProject.mockResolvedValue([])
  api.departments.listByProject.mockResolvedValue([])
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
    // Un día mide 48 px: 340 px son 7,08 días, que se quedan en 7.
    fireEvent.pointerDown(bar, { button: 0, clientX: 100, pointerId: 1 })
    fireEvent.pointerMove(bar, { clientX: 440, pointerId: 1 })
    fireEvent.pointerUp(bar, { clientX: 440, pointerId: 1 })
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
      // Un día mide 48 px: 784 px son más de 2 semanas, pero el tope está en 10 días.
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
    const leftOf = (iso: string) => (fromIsoDate(iso) - fromIsoDate("2026-10-12")) * 48 + 24

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

      // El calendario va solo con icono: su nombre sale en un tooltip.
      await userEvent.hover(screen.getByRole("button", { name: "Ir a fecha" }))
      expect(await screen.findByRole("tooltip")).toHaveTextContent("Ir a fecha")
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

  it("sin leyenda fija: hoy, la semana 1 y los fines de semana se apagan en «Vista», y se recuerda", async () => {
    api.elements.getPlan.mockResolvedValue(
      planOf([rodaje({ startsOn: "2027-04-05", endsOn: "2027-05-16" })])
    )
    renderPage()

    await screen.findByRole("button", { name: "Rodaje: 5 abr 2027 → 16 may 2027" })
    expect(screen.queryByRole("note", { name: "Leyenda" })).toBeNull()
    const todayNumber = () => screen.getByTitle(/· hoy$/).firstElementChild!
    expect(todayNumber()).toHaveClass("bg-primary")

    await userEvent.click(screen.getByRole("button", { name: "Vista" }))
    for (const mark of ["Hoy", "Semana 1", "Fines de semana"]) {
      expect(screen.getByRole("menuitemcheckbox", { name: mark })).toBeChecked()
    }
    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "Hoy" }))
    await userEvent.keyboard("{Escape}")
    expect(todayNumber()).not.toHaveClass("bg-primary")
    expect(JSON.parse(localStorage.getItem("cauce.gantt.leyenda")!)).toEqual({
      today: false,
      week1: true,
      weekends: true,
    })
  })

  it("«Cómo leer el Gantt» lo explica bajo demanda, y clave y sin fin, donde aparecen", async () => {
    api.elements.getPlan.mockResolvedValue(
      planOf([
        rodaje({ startsOn: "2027-04-05", endsOn: "2027-05-16" }),
        preparacion({ startsOn: "2027-02-01", position: 1 }),
      ])
    )
    renderPage()

    await userEvent.click(await screen.findByRole("button", { name: "Cómo leer el Gantt" }))
    const guide = await screen.findByRole("dialog")
    for (const section of ["Barras", "Fechas escritas a mano", "Tiempo", "Acciones"]) {
      expect(within(guide).getByRole("region", { name: section })).toBeInTheDocument()
    }
    expect(within(guide).getByText("De ella se calcula todo el plan")).toBeInTheDocument()
    await userEvent.keyboard("{Escape}")
    expect(screen.queryByRole("dialog")).toBeNull()

    await userEvent.hover(within(rowOf("Rodaje")).getByText("clave"))
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Fecha clave: se escribe a mano y de ella se calcula todo el plan"
    )
    expect(
      screen.getByRole("button", { name: "Preparación: 1 feb 2027, sin fin" })
    ).toHaveAttribute("title", expect.stringContaining("aún no se sabe cuándo acaba"))
  })

  it("el mes de la cabecera, con su año, se queda pegado junto a la columna «Elemento»", async () => {
    api.elements.getPlan.mockResolvedValue(
      planOf([rodaje({ startsOn: "2027-04-05", endsOn: "2027-05-16" })])
    )
    renderPage()

    await screen.findByRole("button", { name: "Ver el detalle de Rodaje" })
    // jsdom no desplaza: se comprueba que el rótulo lleva el año y dónde se pega.
    const october = screen
      .getAllByText((_, node) => node?.textContent === "oct 2026")
      .find((node) => node.classList.contains("sticky"))!
    expect(october.style.left).toBe("calc(280px + 9rem)")
    expect(
      screen.getAllByText((_, node) => node?.textContent === "ene 2027").length
    ).toBeGreaterThan(0)
  })

  it("el borde entre la tabla y el Gantt ajusta la columna «Elemento», y se recuerda", async () => {
    api.elements.getPlan.mockResolvedValue(
      planOf([rodaje({ startsOn: "2027-04-05", endsOn: "2027-05-16" })])
    )
    renderPage()

    const border = await screen.findByRole("separator", {
      name: "Ancho de la columna de elementos",
    })
    expect(border).toHaveAttribute("aria-valuenow", "280")
    // Con el foco, las flechas lo mueven de 16 en 16 px.
    fireEvent.keyDown(border, { key: "ArrowRight" })
    expect(border).toHaveAttribute("aria-valuenow", "296")
    expect(border).toHaveStyle({ left: "calc(296px + 9rem)" })
    expect(localStorage.getItem("cauce.gantt.anchoElemento")).toBe("296")

    // Arrastrar: 100 px más ancha, sin pasar del máximo.
    fireEvent.pointerDown(border, { button: 0, clientX: 500, pointerId: 1 })
    fireEvent.pointerMove(border, { clientX: 600, pointerId: 1 })
    fireEvent.pointerUp(border, { clientX: 600, pointerId: 1 })
    expect(border).toHaveAttribute("aria-valuenow", "396")
    fireEvent.pointerDown(border, { button: 0, clientX: 500, pointerId: 1 })
    fireEvent.pointerMove(border, { clientX: 2000, pointerId: 1 })
    fireEvent.pointerUp(border, { clientX: 2000, pointerId: 1 })
    expect(border).toHaveAttribute("aria-valuenow", "480")

    // El doble clic lo restablece.
    fireEvent.doubleClick(border)
    expect(border).toHaveAttribute("aria-valuenow", "280")
  })

  it("la columna se contrae a una tira con su nota la primera vez, y se vuelve a abrir", async () => {
    api.elements.getPlan.mockResolvedValue(
      planOf([
        rodaje({ startsOn: "2027-04-05", endsOn: "2027-05-16" }),
        element("shooting", "rodaje", "Shooting", {
          kind: "process",
          startsOn: "2027-04-05",
          endsOn: "2027-05-16",
        }),
      ])
    )
    saveGanttFields({ ...DEFAULT_GANTT_FIELDS, start: true, end: true })
    renderPage()

    // El botón va al final de la tabla, detrás de la última columna.
    const labels = (await screen.findByText("Fin")).parentElement!
    expect(labels.lastElementChild).toContainElement(
      screen.getByRole("button", { name: "Contraer la columna" })
    )
    await userEvent.click(screen.getByRole("button", { name: "Contraer la columna" }))
    // Contraída, solo la tira: ni duración, ni inicio, ni fin.
    expect(screen.queryByText("Duración")).toBeNull()
    expect(screen.queryByText("Inicio")).toBeNull()
    expect(screen.queryByText("Fin")).toBeNull()
    // En la tira no se lee el nombre, pero sigue en los botones y en el Tooltip.
    expect(screen.queryByText("Rodaje", { selector: "span" })).toBeNull()
    expect(screen.getByRole("button", { name: "Ver el detalle de Rodaje" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Desplegar Rodaje" })).toBeInTheDocument()
    expect(screen.getByText("Columna contraída")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Entendido" }))
    expect(screen.queryByText("Columna contraída")).toBeNull()
    expect(localStorage.getItem("cauce.gantt.pistaColumna")).toBe("1")
    expect(localStorage.getItem("cauce.gantt.columnaContraida")).toBe("1")

    // Se abre con su botón; contraída otra vez, la nota ya no vuelve.
    await userEvent.click(screen.getByRole("button", { name: "Abrir la columna" }))
    expect(screen.getByRole("button", { name: "Ver el detalle de Rodaje" })).toHaveTextContent(
      "Rodaje"
    )
    await userEvent.click(screen.getByRole("button", { name: "Contraer la columna" }))
    expect(screen.queryByText("Columna contraída")).toBeNull()

    // También el borde la abre: con Enter, o arrastrándolo a la derecha.
    const border = screen.getByRole("separator", { name: "Ancho de la columna de elementos" })
    expect(border).toHaveAttribute("aria-expanded", "false")
    fireEvent.keyDown(border, { key: "Enter" })
    expect(border).toHaveAttribute("aria-expanded", "true")
    fireEvent.keyDown(border, { key: "Enter" })
    fireEvent.pointerDown(border, { button: 0, clientX: 56, pointerId: 1 })
    fireEvent.pointerMove(border, { clientX: 120, pointerId: 1 })
    fireEvent.pointerUp(border, { clientX: 120, pointerId: 1 })
    expect(border).toHaveAttribute("aria-expanded", "true")
  })

  it("arrastrar la cabecera de fechas desplaza el Gantt, sin abrir el día al soltar", async () => {
    api.elements.getPlan.mockResolvedValue(
      planOf([rodaje({ startsOn: "2027-04-05", endsOn: "2027-05-16" })])
    )
    renderPage()

    await screen.findByRole("button", { name: "Rodaje: 5 abr 2027 → 16 may 2027" })
    const [day] = screen.getAllByTitle(/^(lun|mar|mié|jue|vie|sáb|dom) [0-9]/)
    const viewport = day!.closest<HTMLElement>('[data-slot="scroll-area-viewport"]')!
    viewport.scrollLeft = 400
    fireEvent.pointerDown(day!, { button: 0, clientX: 300, pointerId: 1 })
    fireEvent.pointerMove(day!, { clientX: 180, pointerId: 1 })
    expect(viewport.scrollLeft).toBe(520)
    fireEvent.pointerUp(day!, { clientX: 180, pointerId: 1 })
    fireEvent.click(day!)
    expect(screen.queryByRole("dialog")).toBeNull()

    // Un clic quieto sigue abriendo el día.
    fireEvent.pointerDown(day!, { button: 0, clientX: 180, pointerId: 1 })
    fireEvent.pointerUp(day!, { clientX: 180, pointerId: 1 })
    fireEvent.click(day!)
    expect(await screen.findByRole("dialog")).toBeInTheDocument()
  })

  it("el zoom cambia la rejilla: día a día, por semanas o por meses", async () => {
    api.elements.getPlan.mockResolvedValue(
      planOf([rodaje({ startsOn: "2027-04-05", endsOn: "2027-05-16" })])
    )
    renderPage()

    await screen.findByRole("button", { name: "Rodaje: 5 abr 2027 → 16 may 2027" })
    const dayCells = () => screen.queryAllByTitle(/^(lun|mar|mié|jue|vie|sáb|dom) [0-9]/)
    expect(screen.getByRole("radio", { name: "Día" })).toHaveAttribute("aria-checked", "true")
    expect(dayCells().length).toBeGreaterThan(0)

    await userEvent.click(screen.getByRole("radio", { name: "Mes" }))
    expect(screen.getByRole("radio", { name: "Mes" })).toHaveAttribute("aria-checked", "true")
    expect(dayCells()).toHaveLength(0)
    // La barra sigue ahí: el mismo plan, más lejos.
    expect(
      screen.getByRole("button", { name: "Rodaje: 5 abr 2027 → 16 may 2027" })
    ).toBeInTheDocument()
  })

  it("una celda por día: al pasar el ratón se resaltan la celda y su día en la cabecera", async () => {
    api.elements.getPlan.mockResolvedValue(
      planOf([rodaje({ startsOn: "2027-04-05", endsOn: "2027-05-16" })])
    )
    renderPage()

    await screen.findByRole("button", { name: "Rodaje: 5 abr 2027 → 16 may 2027" })
    const track = document.querySelector<HTMLElement>("[data-track]")!
    const days = screen.getAllByTitle(/^(lun|mar|mié|jue|vie|sáb|dom) [0-9]/)
    // En jsdom la pista empieza en x = 0: el tercer día queda entre 96 y 144 px.
    fireEvent.pointerMove(track, { clientX: 110, pointerType: "mouse" })
    expect(days[2]).toHaveAttribute("data-hovered", "true")
    expect(track.querySelector(".ring-1")).toHaveStyle({ left: "96px", width: "48px" })

    fireEvent.pointerLeave(track)
    expect(days[2]).not.toHaveAttribute("data-hovered")
  })

  it("se eligen celdas con clic, arrastrando y con el teclado", async () => {
    // Como miembro, para que el menú de crear no se lleve el foco.
    api.projects.listMine.mockResolvedValue([summary("member")])
    api.elements.getPlan.mockResolvedValue(
      planOf([
        rodaje({ position: 1, startsOn: "2027-04-05", endsOn: "2027-05-16" }),
        preparacion({ position: 0, startsOn: "2027-02-01", endsOn: "2027-04-04" }),
      ])
    )
    renderPage()

    await screen.findByRole("button", { name: "Rodaje: 5 abr 2027 → 16 may 2027" })
    const [first, second] = document.querySelectorAll<HTMLElement>("[data-track]")
    const status = () => screen.getByRole("status").textContent
    // Solo una fila entra en el orden del tabulador.
    expect(first).toHaveAttribute("tabindex", "0")
    expect(second).toHaveAttribute("tabindex", "-1")

    // En jsdom la pista empieza en x = 0: 110 px es el tercer día de la rejilla.
    fireEvent.pointerDown(first!, { button: 0, clientX: 110, pointerType: "mouse" })
    fireEvent.pointerUp(first!)
    fireEvent.doubleClick(first!, { clientX: 110 })
    expect(first).toHaveFocus()
    const start = status()
    expect(start).toMatch(/^Preparación: \d+ \w+$/)

    // Arrastrar hasta el quinto día marca tres.
    fireEvent.pointerDown(first!, { button: 0, clientX: 110, pointerType: "mouse" })
    fireEvent.pointerMove(first!, { clientX: 200, pointerType: "mouse" })
    fireEvent.pointerUp(first!)
    expect(status()).toMatch(/· 3 días$/)
    expect(first!.querySelector("[data-cell-selection]")).toHaveTextContent("3 días")

    // → vuelve a una sola celda; Mayús + → la alarga; ↓ baja de fila.
    fireEvent.keyDown(first!, { key: "ArrowRight" })
    expect(status()).toMatch(/^Preparación: \d+ \w+$/)
    fireEvent.keyDown(first!, { key: "ArrowRight", shiftKey: true })
    expect(status()).toMatch(/· 2 días$/)
    fireEvent.keyDown(first!, { key: "ArrowDown" })
    expect(second).toHaveFocus()
    expect(second).toHaveAttribute("tabindex", "0")
    expect(status()).toMatch(/^Rodaje: /)

    fireEvent.keyDown(second!, { key: "Escape" })
    expect(status()).toBe("")
  })

  describe("crear desde las celdas", () => {
    // La rejilla empieza el lunes de la semana de hoy: con hoy el 13 oct 2026, el 12.
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 9, 13) })
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it("al elegir celdas y un tipo se abre el Sheet de la acción nueva, con las fechas ya puestas", async () => {
      const plan = planOf([rodaje({ startsOn: "2027-04-05", endsOn: "2027-05-16" })])
      api.elements.getPlan.mockResolvedValue(plan)
      api.elements.createAction.mockResolvedValue(plan)
      renderPage()

      await screen.findByRole("button", { name: "Rodaje: 5 abr 2027 → 16 may 2027" })
      const track = document.querySelector<HTMLElement>("[data-track]")!
      // 110 px es el tercer día de la rejilla: el miércoles 14.
      fireEvent.pointerDown(track, { button: 0, clientX: 110, pointerType: "mouse" })
      fireEvent.pointerUp(track)
      fireEvent.doubleClick(track, { clientX: 110 })

      const menu = await screen.findByRole("menu", { name: "Tipo de acción" })
      await userEvent.click(within(menu).getByRole("menuitem", { name: /Reunión/ }))
      const sheet = await screen.findByRole("form", { name: "Nueva reunión" })
      // La reunión nace de 10:00 a 11:00, y el foco está en el título.
      expect(within(sheet).getByLabelText("Desde")).toHaveValue("10:00")
      expect(within(sheet).getByRole("textbox", { name: /Título/ })).toHaveFocus()
      await userEvent.keyboard("Lectura de guion{Enter}")

      await waitFor(() =>
        expect(api.elements.createAction).toHaveBeenCalledWith(
          "rodaje",
          expect.objectContaining({
            kind: "meeting",
            name: "Lectura de guion",
            startsOn: "2026-10-14",
            endsOn: null,
            hours: { allDay: false, startTime: "10:00", endTime: "11:00", hoursMode: null },
            priority: "normal",
          })
        )
      )
      await waitFor(() => expect(screen.queryByRole("form", { name: "Nueva reunión" })).toBeNull())

      // Un periodo: reunión y recordatorio no se ofrecen; una tarea lleva su fin.
      fireEvent.pointerDown(track, { button: 0, clientX: 110, pointerType: "mouse" })
      fireEvent.pointerMove(track, { clientX: 200, pointerType: "mouse" })
      fireEvent.pointerUp(track)
      const range = await screen.findByRole("menu", { name: "Tipo de acción" })
      expect(within(range).getByRole("menuitem", { name: /Reunión/ })).toBeDisabled()
      await userEvent.click(within(range).getByRole("menuitem", { name: /Tarea/ }))
      await screen.findByRole("form", { name: "Nueva tarea" })
      await userEvent.keyboard("Ensayos{Enter}")
      await waitFor(() =>
        expect(api.elements.createAction).toHaveBeenLastCalledWith(
          "rodaje",
          expect.objectContaining({
            kind: "task",
            name: "Ensayos",
            startsOn: "2026-10-14",
            endsOn: "2026-10-16",
          })
        )
      )
    })

    it("desplegado, las acciones van en la fila «Acciones» de su padre; plegado, resumidas bajo su barra", async () => {
      api.elements.getPlan.mockResolvedValue(
        planOf([
          rodaje({ startsOn: "2027-04-05", endsOn: "2027-05-16" }),
          element("lectura", "rodaje", "Lectura de guion", {
            kind: "meeting",
            startsOn: "2026-10-14",
            endsOn: "2026-10-14",
            isPinned: true,
          }),
          element("shooting", "rodaje", "Shooting", {
            kind: "process",
            position: 1,
            startsOn: "2027-04-05",
            endsOn: "2027-05-16",
          }),
          element("aviso", "shooting", "Pedir permisos", {
            kind: "reminder",
            startsOn: "2026-10-15",
            endsOn: "2026-10-15",
            isPinned: true,
          }),
        ])
      )
      renderPage()

      // Rodaje plegado: lo de dentro, resumido bajo su barra, y sin poder tocarse.
      expect(
        await screen.findByRole("img", { name: "Reunión: Lectura de guion, 14 oct" })
      ).toBeInTheDocument()
      expect(
        screen.getByRole("img", { name: "Recordatorio: Pedir permisos, 15 oct" })
      ).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: /Lectura de guion, 14 oct/ })).toBeNull()

      // Desplegado: la reunión, en la fila «Acciones» de Rodaje; el recordatorio,
      // resumido en Shooting, que sigue plegado.
      await userEvent.click(screen.getByRole("button", { name: "Desplegar Rodaje" }))
      const actionsRow = screen.getByRole("treeitem", { name: "Acciones de Rodaje" })
      expect(actionsRow).toHaveTextContent("Acciones · 1")
      const meeting = within(actionsRow).getByRole("button", {
        name: "Reunión: Lectura de guion, 14 oct",
      })
      expect(screen.queryByRole("img", { name: /Lectura de guion/ })).toBeNull()
      expect(
        screen.getByRole("img", { name: "Recordatorio: Pedir permisos, 15 oct" })
      ).toBeInTheDocument()

      await userEvent.click(screen.getByRole("button", { name: "Desplegar Shooting" }))
      expect(
        within(screen.getByRole("treeitem", { name: "Acciones de Shooting" })).getByRole("button", {
          name: "Recordatorio: Pedir permisos, 15 oct",
        })
      ).toBeInTheDocument()

      await userEvent.click(meeting)
      expect(await screen.findByRole("heading", { name: "Lectura de guion" })).toBeInTheDocument()
    })

    it("los tipos de acción se ocultan sobre el Gantt, uno o todos menos uno, y se recuerda", async () => {
      api.elements.getPlan.mockResolvedValue(
        planOf([
          rodaje({ startsOn: "2027-04-05", endsOn: "2027-05-16" }),
          element("lectura", "rodaje", "Lectura de guion", {
            kind: "meeting",
            startsOn: "2026-10-14",
            endsOn: "2026-10-14",
          }),
          element("permisos", "rodaje", "Pedir permisos", {
            kind: "reminder",
            position: 1,
            startsOn: "2026-10-14",
            endsOn: "2026-10-14",
          }),
          element("casting", "rodaje", "Casting", {
            kind: "meeting",
            position: 2,
            startsOn: "2026-10-16",
            endsOn: "2026-10-16",
          }),
        ])
      )
      renderPage()

      const filters = await screen.findByRole("group", { name: "Tipos de acción que se ven" })
      const meetings = within(filters).getByRole("button", { name: "Reunión: 2" })
      expect(meetings).toHaveAttribute("aria-pressed", "true")
      // Dos el mismo día, en un número.
      expect(screen.getByLabelText(/^2 acciones:/)).toBeInTheDocument()

      // Ocultar las reuniones: solo queda el recordatorio, ya sin número, y se avisa.
      await userEvent.click(meetings)
      expect(meetings).toHaveAttribute("aria-pressed", "false")
      expect(screen.queryByLabelText(/^2 acciones:/)).toBeNull()
      expect(screen.queryByRole("img", { name: /Lectura de guion/ })).toBeNull()
      expect(
        screen.getByRole("img", { name: "Recordatorio: Pedir permisos, 14 oct" })
      ).toBeInTheDocument()
      expect(filters).toHaveTextContent("Se ven 1 de 3")
      expect(JSON.parse(localStorage.getItem("cauce.gantt.acciones-ocultas")!)).toEqual(["meeting"])

      // Alt+clic deja solo ese tipo.
      fireEvent.click(within(filters).getByRole("button", { name: "Reunión: 2" }), {
        altKey: true,
      })
      expect(screen.queryByRole("img", { name: /Pedir permisos/ })).toBeNull()
      expect(screen.getByRole("img", { name: "Reunión: Casting, 16 oct" })).toBeInTheDocument()
      expect(filters).toHaveTextContent("Se ven 2 de 3")

      await userEvent.click(within(filters).getByRole("button", { name: "Mostrar todas" }))
      expect(screen.getByLabelText(/^2 acciones:/)).toBeInTheDocument()
      expect(filters).not.toHaveTextContent("Se ven")
    })

    it("los tipos sin acciones van al final, solo con su icono, y no se ocultan", async () => {
      // De antes, oculto un tipo que ya no tiene acciones: no cuenta.
      localStorage.setItem("cauce.gantt.acciones-ocultas", JSON.stringify(["reminder"]))
      api.elements.getPlan.mockResolvedValue(
        planOf([
          rodaje({ startsOn: "2027-04-05", endsOn: "2027-05-16" }),
          element("lectura", "rodaje", "Lectura de guion", {
            kind: "meeting",
            startsOn: "2026-10-14",
            endsOn: "2026-10-14",
          }),
          element("casting", "rodaje", "Casting", {
            kind: "task",
            position: 1,
            startsOn: "2026-10-16",
            endsOn: "2026-10-16",
          }),
        ])
      )
      renderPage()

      const filters = await screen.findByRole("group", { name: "Tipos de acción que se ven" })
      expect(filters).not.toHaveTextContent("Se ven")
      const buttons = within(filters).getAllByRole("button")
      expect(buttons.map((button) => button.getAttribute("aria-label"))).toEqual([
        "Tarea: 1",
        "Reunión: 1",
        "Evento: aún no hay",
        "Recordatorio: aún no hay",
        "Contratación: aún no hay",
        "Viaje: aún no hay",
      ])
      // Deshabilitados pero enfocables: con el teclado se llega a su tooltip.
      const hiring = within(filters).getByRole("button", { name: "Contratación: aún no hay" })
      expect(hiring).toHaveAttribute("aria-disabled", "true")
      expect(hiring).not.toBeDisabled()
      await userEvent.hover(hiring)
      expect(await screen.findByRole("tooltip")).toHaveTextContent("Contratación · aún no hay")
      await userEvent.click(hiring)
      expect(filters).not.toHaveTextContent("Se ven")

      // Dejar solo las reuniones oculta las tareas, pero no los tipos vacíos.
      fireEvent.click(within(filters).getByRole("button", { name: "Reunión: 1" }), {
        altKey: true,
      })
      expect(filters).toHaveTextContent("Se ven 1 de 2")
      expect(JSON.parse(localStorage.getItem("cauce.gantt.acciones-ocultas")!)).toEqual(["task"])
      expect(within(filters).getByRole("button", { name: "Evento: aún no hay" })).toHaveAttribute(
        "aria-disabled",
        "true"
      )
    })

    it("pasar por un tipo resalta sus marcas, y pasar por una marca señala su tipo", async () => {
      api.elements.getPlan.mockResolvedValue(
        planOf([
          rodaje({ startsOn: "2027-04-05", endsOn: "2027-05-16" }),
          element("lectura", "rodaje", "Lectura de guion", {
            kind: "meeting",
            startsOn: "2026-10-14",
            endsOn: "2026-10-14",
          }),
          element("permisos", "rodaje", "Pedir permisos", {
            kind: "reminder",
            position: 1,
            startsOn: "2026-10-14",
            endsOn: "2026-10-14",
          }),
        ])
      )
      renderPage()

      const filters = await screen.findByRole("group", { name: "Tipos de acción que se ven" })
      const meetings = within(filters).getByRole("button", { name: "Reunión: 1" })
      // El CSS atenúa lo que no es del tipo: aquí se comprueba lo que lee.
      const surface = filters.closest<HTMLElement>("[data-calendar-surface]")!
      fireEvent.pointerOver(meetings)
      expect(surface.dataset.actionFocus).toBe("meeting")
      expect(screen.getByLabelText(/^2 acciones:/)).toHaveAttribute(
        "data-action-kind",
        "meeting reminder"
      )
      fireEvent.pointerLeave(surface)
      expect(surface.dataset.actionFocus).toBeUndefined()

      // Un tipo oculto no resalta nada.
      await userEvent.click(meetings)
      fireEvent.pointerOver(meetings)
      expect(surface.dataset.actionFocus).toBeUndefined()

      fireEvent.pointerOver(
        screen.getByRole("img", { name: "Recordatorio: Pedir permisos, 14 oct" })
      )
      expect(surface.dataset.actionHover).toBe("reminder")
    })

    it("una celda con acciones enseña su lista, con lo de dentro si la fila está plegada", async () => {
      api.elements.getPlan.mockResolvedValue(
        planOf([
          rodaje({ startsOn: "2027-04-05", endsOn: "2027-05-16" }),
          element("lectura", "rodaje", "Lectura de guion", {
            kind: "meeting",
            startsOn: "2026-10-14",
            endsOn: "2026-10-14",
            isPinned: true,
          }),
          element("shooting", "rodaje", "Shooting", { kind: "process", position: 1 }),
          element("permisos", "shooting", "Pedir permisos", {
            kind: "task",
            startsOn: "2026-10-13",
            endsOn: "2026-10-16",
            isPinned: true,
          }),
        ])
      )
      renderPage()

      await screen.findByRole("img", { name: "Reunión: Lectura de guion, 14 oct" })
      const track = document.querySelector<HTMLElement>("[data-track]")!
      fireEvent.pointerDown(track, { button: 0, clientX: 110, pointerType: "mouse" })
      fireEvent.pointerUp(track)
      fireEvent.doubleClick(track, { clientX: 110 })

      const list = await screen.findByRole("menu", { name: "Acciones de la celda" })
      expect(within(list).getByRole("menuitem", { name: /Lectura de guion/ })).toHaveTextContent(
        "Reunión"
      )
      // La tarea es de Shooting, que cuelga de Rodaje, plegado.
      expect(within(list).getByRole("menuitem", { name: /Pedir permisos/ })).toHaveTextContent(
        "Shooting"
      )

      // Mayús + Enter hace lo que dice su pista, aunque el foco esté en la lista.
      // Al abrirse no hay nada elegido: Enter no abre la primera acción.
      await userEvent.keyboard("{Enter}")
      expect(screen.queryByRole("heading", { name: "Lectura de guion" })).toBeNull()
      await userEvent.keyboard("{Shift>}{Enter}{/Shift}")
      expect(await screen.findByRole("heading", { name: "mié 14 oct 2026" })).toBeInTheDocument()
      await userEvent.click(screen.getByRole("button", { name: "Cerrar" }))

      fireEvent.pointerDown(track, { button: 0, clientX: 110, pointerType: "mouse" })
      fireEvent.pointerUp(track)
      fireEvent.doubleClick(track, { clientX: 110 })
      await userEvent.click(await screen.findByRole("button", { name: "Nueva acción en este día" }))
      expect(await screen.findByRole("menu", { name: "Tipo de acción" })).toBeInTheDocument()
      await userEvent.keyboard("{Escape}")

      fireEvent.pointerDown(track, { button: 0, clientX: 110, pointerType: "mouse" })
      fireEvent.pointerUp(track)
      fireEvent.doubleClick(track, { clientX: 110 })
      await userEvent.click(await screen.findByRole("menuitem", { name: /Lectura de guion/ }))
      expect(await screen.findByRole("heading", { name: "Lectura de guion" })).toBeInTheDocument()
    })

    it("una acción sin duración solo está en su día, y en él lleva su aviso", async () => {
      api.elements.getPlan.mockResolvedValue(
        planOf([
          rodaje({ startsOn: "2027-04-05", endsOn: "2027-05-16" }),
          element("calendario", "rodaje", "Elaboración de calendario", {
            kind: "task",
            startsOn: "2026-10-12",
            endsOn: null,
            issue: { code: "missing-duration" },
          }),
          element("presupuesto", "rodaje", "Presupuesto de ejecución", {
            kind: "task",
            position: 1,
            startsOn: "2026-10-12",
            endsOn: null,
            issue: { code: "missing-duration" },
          }),
        ])
      )
      renderPage()

      await screen.findByRole("button", { name: "Rodaje: 5 abr 2027 → 16 may 2027" })
      const track = document.querySelector<HTMLElement>("[data-track]")!
      // Dos días después ya no está: la celda está vacía y se ofrece crear.
      fireEvent.pointerDown(track, { button: 0, clientX: 110, pointerType: "mouse" })
      fireEvent.pointerUp(track)
      fireEvent.doubleClick(track, { clientX: 110 })
      expect(await screen.findByRole("menu", { name: "Tipo de acción" })).toBeInTheDocument()
      await userEvent.keyboard("{Escape}")

      // En su día hay dos: un clic enseña la lista, cada una con su aviso.
      fireEvent.pointerDown(track, { button: 0, clientX: 10, pointerType: "mouse" })
      fireEvent.pointerUp(track)
      const list = await screen.findByRole("menu", { name: "Acciones de la celda" })
      const item = within(list).getByRole("menuitem", { name: /Elaboración de calendario/ })
      expect(within(item).getByLabelText("Sin duración")).toBeInTheDocument()
    })

    it("desplegado, la celda de la fila «Acciones» enseña las suyas; la del elemento, crear", async () => {
      api.elements.getPlan.mockResolvedValue(
        planOf([
          rodaje({ startsOn: "2027-04-05", endsOn: "2027-05-16" }),
          element("lectura", "rodaje", "Lectura de guion", {
            kind: "meeting",
            startsOn: "2026-10-14",
            endsOn: "2026-10-14",
            isPinned: true,
          }),
        ])
      )
      renderPage()

      await userEvent.click(await screen.findByRole("button", { name: "Desplegar Rodaje" }))
      const actions = document.querySelector<HTMLElement>('[data-track="rodaje#acciones"]')!
      fireEvent.pointerDown(actions, { button: 0, clientX: 110, pointerType: "mouse" })
      fireEvent.pointerUp(actions)
      fireEvent.doubleClick(actions, { clientX: 110 })
      const list = await screen.findByRole("menu", { name: "Acciones de la celda" })
      expect(within(list).getByRole("menuitem", { name: /Lectura de guion/ })).toBeInTheDocument()
      await userEvent.keyboard("{Escape}")

      // En la fila de Rodaje, desplegada, sus acciones ya tienen su fila: se ofrece crear.
      const row = document.querySelector<HTMLElement>('[data-track="rodaje"]')!
      fireEvent.pointerDown(row, { button: 0, clientX: 110, pointerType: "mouse" })
      fireEvent.pointerUp(row)
      fireEvent.doubleClick(row, { clientX: 110 })
      expect(await screen.findByRole("menu", { name: "Tipo de acción" })).toBeInTheDocument()
    })

    it("quien no es propietaria ve la lista de la celda, sin «Nueva acción»", async () => {
      api.projects.listMine.mockResolvedValue([summary("member")])
      api.elements.getPlan.mockResolvedValue(
        planOf([
          rodaje({ startsOn: "2027-04-05", endsOn: "2027-05-16" }),
          element("lectura", "rodaje", "Lectura de guion", {
            kind: "meeting",
            startsOn: "2026-10-14",
            endsOn: "2026-10-14",
            isPinned: true,
          }),
          element("aviso", "rodaje", "Pedir permisos", {
            kind: "reminder",
            position: 1,
            startsOn: "2026-10-14",
            endsOn: "2026-10-14",
            isPinned: true,
          }),
        ])
      )
      renderPage()

      await screen.findByRole("button", { name: "Rodaje: 5 abr 2027 → 16 may 2027" })
      const track = document.querySelector<HTMLElement>("[data-track]")!
      // Un clic basta: hay dos, así que sale la lista.
      fireEvent.pointerDown(track, { button: 0, clientX: 110, pointerType: "mouse" })
      fireEvent.pointerUp(track)
      expect(await screen.findByRole("menu", { name: "Acciones de la celda" })).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: /Nueva acción/ })).toBeNull()
    })

    it("el panel del día: sus acciones y lo que está en curso; se pasa de día y se crea", async () => {
      const plan = planOf([
        rodaje({ startsOn: "2026-10-12", endsOn: "2026-11-22" }),
        element("lectura", "rodaje", "Lectura de guion", {
          kind: "meeting",
          startsOn: "2026-10-14",
          endsOn: "2026-10-14",
          isPinned: true,
        }),
        element("shooting", "rodaje", "Shooting", {
          kind: "process",
          position: 1,
          startsOn: "2026-10-12",
          endsOn: "2026-10-30",
        }),
      ])
      api.elements.getPlan.mockResolvedValue(plan)
      api.elements.createAction.mockResolvedValue(plan)
      renderPage()

      await userEvent.click(await screen.findByTitle("mié 14 oct 2026"))
      let panel = await screen.findByRole("dialog")
      expect(within(panel).getByRole("heading", { name: "mié 14 oct 2026" })).toBeInTheDocument()
      const actions = within(panel).getByRole("region", { name: "Acciones del día" })
      expect(within(actions).getByRole("button", { name: /Lectura de guion/ })).toHaveTextContent(
        "Rodaje"
      )
      const running = within(panel).getByRole("region", { name: "En curso" })
      expect(within(running).getByRole("button", { name: /Shooting/ })).toBeInTheDocument()

      // Desde aquí se crea colgando, por defecto, de lo más concreto en curso.
      await userEvent.click(within(panel).getByRole("button", { name: "Nueva acción" }))
      const picker = within(panel).getByRole("button", { name: "Cuelga de" })
      expect(picker).toHaveTextContent("Shooting")
      // Se puede colgar de cualquier fase, subfase o proceso, también de la fase.
      await userEvent.click(picker)
      expect(await screen.findByRole("option", { name: /Rodaje/ })).toBeInTheDocument()
      await userEvent.click(screen.getByRole("option", { name: /Shooting/ }))
      await userEvent.click(within(panel).getByRole("menuitem", { name: /Recordatorio/ }))
      // El Sheet de la acción nueva sustituye al del día.
      await screen.findByRole("form", { name: "Nuevo recordatorio" })
      await userEvent.keyboard("Fotos{Enter}")
      await waitFor(() =>
        expect(api.elements.createAction).toHaveBeenCalledWith(
          "shooting",
          expect.objectContaining({
            kind: "reminder",
            name: "Fotos",
            startsOn: "2026-10-14",
            endsOn: null,
          })
        )
      )

      await userEvent.click(await screen.findByTitle("mié 14 oct 2026"))
      panel = await screen.findByRole("dialog")
      await userEvent.click(within(panel).getByRole("button", { name: "Día siguiente" }))
      expect(within(panel).getByRole("heading", { name: "jue 15 oct 2026" })).toBeInTheDocument()
      expect(within(panel).getByText("Nada este día.")).toBeInTheDocument()

      // Abrir un elemento cambia el panel por el suyo.
      await userEvent.click(within(panel).getByRole("button", { name: /Shooting/ }))
      expect(await screen.findByRole("heading", { name: "Shooting" })).toBeInTheDocument()
      expect(screen.queryByRole("heading", { name: "jue 15 oct 2026" })).toBeNull()
    })

    it("desde una fila, el panel cuelga de su fase y no de las hermanas; sus flechas mueven la celda", async () => {
      api.elements.getPlan.mockResolvedValue(
        planOf([
          preparacion({ position: 0, startsOn: "2026-10-12", endsOn: "2026-11-22" }),
          element("ensayos", "preparacion", "Ensayos", {
            kind: "process",
            startsOn: "2026-10-12",
            endsOn: "2026-10-30",
          }),
          rodaje({ position: 1, startsOn: "2026-10-12", endsOn: "2026-11-22" }),
          element("shooting", "rodaje", "Shooting", {
            kind: "process",
            startsOn: "2026-10-12",
            endsOn: "2026-10-30",
          }),
        ])
      )
      renderPage()

      await userEvent.click(await screen.findByRole("button", { name: "Desplegar Rodaje" }))
      const shooting = document.querySelector<HTMLElement>('[data-track="shooting"]')!
      fireEvent.pointerDown(shooting, { button: 0, clientX: 110, pointerType: "mouse" })
      fireEvent.pointerUp(shooting)
      fireEvent.doubleClick(shooting, { clientX: 110 })
      await userEvent.keyboard("{Escape}")
      fireEvent.keyDown(shooting, { key: "Enter", shiftKey: true })

      const panel = await screen.findByRole("dialog")
      await userEvent.click(within(panel).getByRole("button", { name: "Nueva acción" }))
      const picker = within(panel).getByRole("button", { name: "Cuelga de" })
      expect(picker).toHaveTextContent("Shooting")
      await userEvent.click(picker)
      expect(await screen.findByRole("option", { name: /Rodaje/ })).toBeInTheDocument()
      expect(screen.queryByRole("option", { name: /Preparación/ })).toBeNull()
      expect(screen.queryByRole("option", { name: /Ensayos/ })).toBeNull()
      await userEvent.keyboard("{Escape}")

      // Las flechas del panel mueven también la celda elegida.
      expect(screen.getByRole("status")).toHaveTextContent("Shooting: 14 oct")
      await userEvent.click(within(panel).getByRole("button", { name: "Día siguiente" }))
      expect(screen.getByRole("status")).toHaveTextContent("Shooting: 15 oct")

      // Al cerrar el panel sin hacer nada, la celda se queda en el día al que se llegó.
      await userEvent.click(within(panel).getByRole("button", { name: "Cerrar" }))
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
      expect(screen.getByRole("status")).toHaveTextContent("Shooting: 15 oct")
    })

    it("desde la cabecera del día, «Cuelga de» ofrece cualquier fase, subfase o proceso", async () => {
      api.elements.getPlan.mockResolvedValue(
        planOf([
          preparacion({ position: 0, startsOn: "2027-01-04", endsOn: "2027-04-04" }),
          element("ensayos", "preparacion", "Ensayos", {
            kind: "process",
            startsOn: "2027-02-01",
            endsOn: "2027-02-28",
          }),
          rodaje({ position: 1, startsOn: "2026-10-12", endsOn: "2026-11-22" }),
        ])
      )
      renderPage()

      await userEvent.click(await screen.findByTitle("mié 14 oct 2026"))
      const panel = await screen.findByRole("dialog")
      await userEvent.click(within(panel).getByRole("button", { name: "Nueva acción" }))
      const picker = within(panel).getByRole("button", { name: "Cuelga de" })
      // Por defecto, lo que está en curso ese día; pero se puede elegir cualquiera.
      expect(picker).toHaveTextContent("Rodaje")
      await userEvent.click(picker)
      expect(await screen.findByRole("option", { name: /Preparación/ })).toBeInTheDocument()
      expect(screen.getByRole("option", { name: /Ensayos/ })).toBeInTheDocument()
      expect(screen.getByRole("option", { name: /Rodaje/ })).toHaveTextContent("en curso")
    })

    it("con el teclado, Mayús + Enter en una celda abre su día", async () => {
      api.elements.getPlan.mockResolvedValue(
        planOf([rodaje({ startsOn: "2027-04-05", endsOn: "2027-05-16" })])
      )
      renderPage()

      await screen.findByRole("button", { name: "Rodaje: 5 abr 2027 → 16 may 2027" })
      const track = document.querySelector<HTMLElement>("[data-track]")!
      fireEvent.focus(track)
      fireEvent.keyDown(track, { key: "ArrowRight" })
      fireEvent.keyDown(track, { key: "Enter", shiftKey: true })
      expect(await screen.findByRole("heading", { name: "mié 14 oct 2026" })).toBeInTheDocument()
    })

    it("las acciones se arrastran: el cuerpo las mueve y el borde alarga, salvo las de un día", async () => {
      const plan = planOf([
        rodaje({ startsOn: "2027-04-05", endsOn: "2027-05-16" }),
        element("lectura", "rodaje", "Lectura de guion", {
          kind: "meeting",
          duration: { amount: 1, unit: "days" },
          startsOn: "2026-10-14",
          endsOn: "2026-10-14",
          isPinned: true,
        }),
        element("ensayos", "rodaje", "Ensayos", {
          kind: "task",
          position: 1,
          duration: { amount: 3, unit: "days" },
          startsOn: "2026-10-19",
          endsOn: "2026-10-21",
          isPinned: true,
        }),
      ])
      api.elements.getPlan.mockResolvedValue(plan)
      api.elements.updatePlan.mockResolvedValue(plan)
      renderPage()

      await userEvent.click(await screen.findByRole("button", { name: "Desplegar Rodaje" }))
      // Un día mide 48 px: 100 px son 2 días más tarde.
      const meeting = screen.getByRole("button", { name: "Reunión: Lectura de guion, 14 oct" })
      fireEvent.pointerDown(meeting, { button: 0, clientX: 100, pointerId: 1 })
      fireEvent.pointerMove(meeting, { clientX: 200, pointerId: 1 })
      fireEvent.pointerUp(meeting, { clientX: 200, pointerId: 1 })
      await waitFor(() =>
        expect(api.elements.updatePlan).toHaveBeenLastCalledWith("lectura", {
          fixedStart: "2026-10-16",
        })
      )
      // Soltar no abre el detalle.
      fireEvent.click(meeting)
      expect(screen.queryByRole("heading", { name: "Lectura de guion" })).toBeNull()

      // Una reunión no se alarga: Alt + → no hace nada.
      const calls = api.elements.updatePlan.mock.calls.length
      fireEvent.keyDown(meeting, { key: "ArrowRight", altKey: true })
      expect(api.elements.updatePlan).toHaveBeenCalledTimes(calls)

      // El borde del fin de la tarea la alarga un día.
      const task = screen.getByRole("button", { name: "Tarea: Ensayos, 19 oct → 21 oct" })
      const edge = task.querySelector("span")!
      fireEvent.pointerDown(edge, { button: 0, clientX: 300, pointerId: 2 })
      fireEvent.pointerMove(edge, { clientX: 345, pointerId: 2 })
      fireEvent.pointerUp(edge, { clientX: 345, pointerId: 2 })
      await waitFor(() =>
        expect(api.elements.updatePlan).toHaveBeenLastCalledWith("ensayos", {
          duration: { amount: 4, unit: "days" },
        })
      )
    })

    it("un clic en una celda vacía la elige y enseña cómo crear; el doble clic crea, y la pista se va", async () => {
      api.elements.getPlan.mockResolvedValue(
        planOf([rodaje({ startsOn: "2027-04-05", endsOn: "2027-05-16" })])
      )
      renderPage()

      await screen.findByRole("button", { name: "Rodaje: 5 abr 2027 → 16 may 2027" })
      const track = document.querySelector<HTMLElement>("[data-track]")!
      fireEvent.pointerDown(track, { button: 0, clientX: 110, pointerType: "mouse" })
      fireEvent.pointerUp(track)
      expect(screen.getByRole("status")).toHaveTextContent("Rodaje: 14 oct")
      expect(screen.queryByRole("menu", { name: "Tipo de acción" })).toBeNull()
      expect(screen.getByText("Doble clic o Enter para crear")).toBeInTheDocument()

      fireEvent.doubleClick(track, { clientX: 110 })
      expect(await screen.findByRole("menu", { name: "Tipo de acción" })).toBeInTheDocument()
      expect(screen.queryByText("Doble clic o Enter para crear")).toBeNull()
      await userEvent.keyboard("{Escape}")
      // Vista una vez, no vuelve.
      expect(screen.queryByText("Doble clic o Enter para crear")).toBeNull()
      expect(localStorage.getItem("cauce.gantt.pistaCelda")).toBe("vista")
    })

    it("en una pantalla táctil, un toque abre la celda", async () => {
      api.elements.getPlan.mockResolvedValue(
        planOf([rodaje({ startsOn: "2027-04-05", endsOn: "2027-05-16" })])
      )
      renderPage()

      await screen.findByRole("button", { name: "Rodaje: 5 abr 2027 → 16 may 2027" })
      const track = document.querySelector<HTMLElement>("[data-track]")!
      fireEvent.pointerDown(track, { button: 0, clientX: 110, pointerType: "touch" })
      fireEvent.pointerUp(track)
      expect(await screen.findByRole("menu", { name: "Tipo de acción" })).toBeInTheDocument()
    })

    it("Supr borra la única acción de la celda, tras confirmarlo; con varias, abre su lista con papeleras", async () => {
      const lectura = element("lectura", "rodaje", "Lectura de guion", {
        kind: "meeting",
        startsOn: "2026-10-14",
        endsOn: "2026-10-14",
        isPinned: true,
      })
      const avisos = ["aviso1", "aviso2"].map((id, index) =>
        element(id, "rodaje", `Aviso ${index + 1}`, {
          kind: "reminder",
          position: index + 1,
          startsOn: "2026-10-16",
          endsOn: "2026-10-16",
          isPinned: true,
        })
      )
      const rodajeConFechas = rodaje({ startsOn: "2027-04-05", endsOn: "2027-05-16" })
      api.elements.getPlan.mockResolvedValue(planOf([rodajeConFechas, lectura, ...avisos]))
      api.elements.deleteElement.mockResolvedValue(planOf([rodajeConFechas, ...avisos]))
      renderPage()

      await userEvent.click(await screen.findByRole("button", { name: "Desplegar Rodaje" }))
      const lane = document.querySelector<HTMLElement>('[data-track="rodaje#acciones"]')!
      // El 14 oct es el tercer día: una sola acción, que se abre y lleva la pista.
      fireEvent.pointerDown(lane, { button: 0, clientX: 2 * 48 + 10, pointerType: "mouse" })
      fireEvent.pointerUp(lane)
      expect(await screen.findByText("Supr para borrar")).toBeInTheDocument()

      fireEvent.keyDown(lane, { key: "Delete" })
      const ask = await screen.findByRole("alertdialog", {
        name: "¿Borrar la reunión “Lectura de guion”?",
      })
      // Se abre sin foco en los botones: ni se borra ni se cancela por inercia.
      await waitFor(() => expect(ask).toHaveFocus())
      expect(ask).toHaveTextContent("Reunión")
      expect(ask).toHaveTextContent("en Rodaje")
      expect(api.elements.deleteElement).not.toHaveBeenCalled()
      await userEvent.click(within(ask).getByRole("button", { name: "Borrar" }))

      expect(api.elements.deleteElement).toHaveBeenCalledWith("lectura")
      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith(
          "Se borró la reunión “Lectura de guion”",
          expect.anything()
        )
      )
      // El panel de la acción borrada se cierra, y la pista ya no vuelve.
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
      expect(screen.queryByText("Supr para borrar")).toBeNull()
      expect(localStorage.getItem("cauce.gantt.pistaBorrar")).toBe("1")

      // El 16 oct tiene dos: Supr no borra ninguna, abre su lista para elegir.
      fireEvent.pointerDown(lane, { button: 0, clientX: 4 * 48 + 10, pointerType: "mouse" })
      fireEvent.pointerUp(lane)
      await userEvent.keyboard("{Escape}")
      fireEvent.keyDown(lane, { key: "Backspace" })
      expect(await screen.findByRole("menu", { name: "Acciones de la celda" })).toBeInTheDocument()
      expect(screen.queryByRole("alertdialog")).toBeNull()
      expect(api.elements.deleteElement).toHaveBeenCalledTimes(1)

      // En la lista, cada fila tiene su papelera: borra esa, tras confirmarlo.
      await userEvent.click(screen.getByRole("button", { name: "Borrar Aviso 2" }))
      expect(
        await screen.findByRole("alertdialog", { name: "¿Borrar el recordatorio “Aviso 2”?" })
      ).toBeInTheDocument()
    })

    it("el clic derecho en una acción: abrirla, cambiarla de tipo y borrarla", async () => {
      const ensayo = element("ensayo", "rodaje", "Ensayo general", {
        kind: "task",
        startsOn: "2026-10-14",
        endsOn: "2026-10-16",
        duration: { amount: 3, unit: "days" },
        isPinned: true,
      })
      const rodajeConFechas = rodaje({ startsOn: "2027-04-05", endsOn: "2027-05-16" })
      api.elements.getPlan.mockResolvedValue(planOf([rodajeConFechas, ensayo]))
      api.elements.editElement.mockResolvedValue(planOf([rodajeConFechas, ensayo]))
      renderPage()

      await userEvent.click(await screen.findByRole("button", { name: "Desplegar Rodaje" }))
      const mark = screen.getByRole("button", { name: /^Tarea: Ensayo general/ })
      fireEvent.contextMenu(mark)
      const menu = await screen.findByRole("menu")
      expect(menu).toHaveTextContent("Ensayo general")
      expect(menu).toHaveTextContent("Tarea · 14 oct → 16 oct")

      // Pasar una tarea de tres días a reunión la deja en un día, como pide la API.
      within(menu).getByRole("menuitem", { name: "Cambiar a" }).focus()
      await userEvent.keyboard("{ArrowRight}")
      await userEvent.click(await screen.findByRole("menuitem", { name: "Reunión" }))
      expect(api.elements.editElement).toHaveBeenCalledWith("ensayo", {
        kind: "meeting",
        duration: { amount: 1, unit: "days" },
      })

      fireEvent.contextMenu(screen.getByRole("button", { name: /^Tarea: Ensayo general/ }))
      await userEvent.click(await screen.findByRole("menuitem", { name: /Borrar/ }))
      expect(
        await screen.findByRole("alertdialog", { name: "¿Borrar la tarea “Ensayo general”?" })
      ).toBeInTheDocument()
    })

    it("en la fila «Acciones», un clic en la celda de una sola acción la abre; con varias, solo elige", async () => {
      api.elements.getPlan.mockResolvedValue(
        planOf([
          rodaje({ startsOn: "2027-04-05", endsOn: "2027-05-16" }),
          element("ensayos", "rodaje", "Ensayos", {
            kind: "task",
            startsOn: "2026-10-19",
            endsOn: "2026-10-21",
            isPinned: true,
          }),
          element("lectura", "rodaje", "Lectura de guion", {
            kind: "meeting",
            position: 1,
            startsOn: "2026-10-14",
            endsOn: "2026-10-14",
            isPinned: true,
          }),
          element("aviso", "rodaje", "Pedir permisos", {
            kind: "reminder",
            position: 2,
            startsOn: "2026-10-14",
            endsOn: "2026-10-14",
            isPinned: true,
          }),
        ])
      )
      renderPage()

      await userEvent.click(await screen.findByRole("button", { name: "Desplegar Rodaje" }))
      const lane = document.querySelector<HTMLElement>('[data-track="rodaje#acciones"]')!
      // El 20 oct es el noveno día (8 × 48 px): solo lo cubre la tarea de Ensayos.
      fireEvent.pointerDown(lane, { button: 0, clientX: 8 * 48 + 10, pointerType: "mouse" })
      fireEvent.pointerUp(lane)
      expect(await screen.findByRole("heading", { name: "Ensayos" })).toBeInTheDocument()

      // El 14 oct tiene dos: la celda queda elegida y no se abre ninguna.
      await userEvent.click(screen.getByRole("button", { name: "Cerrar" }))
      fireEvent.pointerDown(lane, { button: 0, clientX: 110, pointerType: "mouse" })
      fireEvent.pointerUp(lane)
      expect(screen.getByRole("status")).toHaveTextContent("Acciones de Rodaje: 14 oct")
      expect(screen.queryByRole("heading", { name: "Lectura de guion" })).toBeNull()
    })

    it("un clic es para ver: en una fila plegada, la única acción de la celda abre su detalle", async () => {
      api.elements.getPlan.mockResolvedValue(
        planOf([
          rodaje({ startsOn: "2027-04-05", endsOn: "2027-05-16" }),
          element("lectura", "rodaje", "Lectura de guion", {
            kind: "meeting",
            startsOn: "2026-10-14",
            endsOn: "2026-10-14",
            isPinned: true,
          }),
        ])
      )
      renderPage()

      await screen.findByRole("img", { name: "Reunión: Lectura de guion, 14 oct" })
      const track = document.querySelector<HTMLElement>('[data-track="rodaje"]')!
      fireEvent.pointerDown(track, { button: 0, clientX: 110, pointerType: "mouse" })
      fireEvent.pointerUp(track)
      expect(await screen.findByRole("heading", { name: "Lectura de guion" })).toBeInTheDocument()
      expect(screen.queryByRole("menu")).toBeNull()
      // La celda elegida pasa a la fila donde vive la acción, que queda desplegada.
      expect(screen.getByRole("status")).toHaveTextContent("Acciones de Rodaje: 14 oct")
      await userEvent.click(screen.getByRole("button", { name: "Cerrar" }))
      expect(screen.getByRole("treeitem", { name: "Acciones de Rodaje" })).toBeInTheDocument()
      expect(
        document.querySelector('[data-track="rodaje#acciones"] [data-cell-selection]')
      ).not.toBeNull()
    })

    it("en «Cuándo», una acción de un día pasa a otro día sin chocar con su propio fin", async () => {
      // Con hoy fijo: la rejilla empieza el 12 de octubre y el 23 se puede elegir.
      vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 9, 13) })
      onTestFinished(() => {
        vi.useRealTimers()
      })
      api.elements.getPlan.mockResolvedValue(
        planOf([
          rodaje({ startsOn: "2027-04-05", endsOn: "2027-05-16" }),
          element("ensayos", "rodaje", "Ensayos", {
            kind: "task",
            startsOn: "2026-10-20",
            endsOn: "2026-10-20",
            duration: { amount: 1, unit: "days" },
            isPinned: true,
          }),
        ])
      )
      renderPage()

      await userEvent.click(await screen.findByRole("button", { name: "Desplegar Rodaje" }))
      const lane = document.querySelector<HTMLElement>('[data-track="rodaje#acciones"]')!
      fireEvent.pointerDown(lane, { button: 0, clientX: 8 * 48 + 10, pointerType: "mouse" })
      fireEvent.pointerUp(lane)
      const panel = await screen.findByRole("dialog", { name: "Ensayos" })
      await userEvent.click(within(panel).getByRole("button", { name: /^Cuándo:/ }))
      const day = document.querySelector<HTMLElement>('[data-day="2026-10-23"] button')!
      await userEvent.click(day)
      await userEvent.click(day)

      expect(toast.error).not.toHaveBeenCalled()
      expect(
        within(panel).getByRole("button", { name: /^Cuándo: vie 23 oct → vie 23 oct 2026/ })
      ).toBeInTheDocument()
      expect(within(panel).getByText(/sin guardar/)).toBeInTheDocument()
    })

    it("quien no es propietaria elige celdas, pero no ve el menú de crear", async () => {
      api.projects.listMine.mockResolvedValue([summary("member")])
      api.elements.getPlan.mockResolvedValue(
        planOf([rodaje({ startsOn: "2027-04-05", endsOn: "2027-05-16" })])
      )
      renderPage()

      await screen.findByRole("button", { name: "Rodaje: 5 abr 2027 → 16 may 2027" })
      const track = document.querySelector<HTMLElement>("[data-track]")!
      fireEvent.pointerDown(track, { button: 0, clientX: 110, pointerType: "mouse" })
      fireEvent.pointerUp(track)
      fireEvent.doubleClick(track, { clientX: 110 })
      expect(screen.getByRole("status")).toHaveTextContent("Rodaje: 14 oct")
      expect(screen.queryByRole("menu", { name: "Tipo de acción" })).toBeNull()
    })
  })

  it("las fases sin duración llevan su aviso, y la cabecera dice cuántas son", async () => {
    api.elements.getPlan.mockResolvedValue(
      planOf([
        rodaje({ position: 1, duration: { amount: 6, unit: "weeks" }, startsOn: "2027-04-05" }),
        preparacion({ position: 0, startsOn: "2027-02-01" }),
      ])
    )
    renderPage()

    const row = within(await screen.findByText("Preparación").then((node) => node.closest("li")!))
    expect(row.getByLabelText("Sin duración")).toBeInTheDocument()
    expect(within(rowOf("Rodaje")).queryByLabelText("Sin duración")).toBeNull()

    expect(screen.getByText("1 fase sin duración")).toBeInTheDocument()
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
    // Con todas las fases con duración, el aviso de la cabecera se va.
    expect(screen.queryByText(/sin duración/)).toBeNull()
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

  it("el panel pasa de elemento con sus botones; pulsar el calendario no lo cierra, pulsar fuera sí", async () => {
    api.elements.getPlan.mockResolvedValue(planOf([rodaje(), preparacion()]))
    renderPage()

    await userEvent.click(await screen.findByRole("button", { name: "Ver el detalle de Rodaje" }))
    const first = screen.getByRole("dialog", { name: "Rodaje" })
    expect(within(first).getByRole("button", { name: "Elemento anterior" })).toBeDisabled()
    await userEvent.click(within(first).getByRole("button", { name: "Elemento siguiente" }))
    expect(screen.getByRole("dialog", { name: "Preparación" })).toBeInTheDocument()

    // El calendario sigue vivo con el panel abierto.
    await userEvent.pointer({
      keys: "[MouseLeft]",
      target: document.querySelector<HTMLElement>("[data-calendar-surface]")!,
    })
    expect(screen.getByRole("dialog", { name: "Preparación" })).toBeInTheDocument()
    // Fuera de él (la navegación, la cabecera de la app), se cierra.
    await userEvent.pointer({ keys: "[MouseLeft]", target: document.body })
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  })

  it("el panel edita un borrador: nada se guarda hasta Guardar, y salir con cambios pregunta", async () => {
    const withWeeks = (amount: number) =>
      planOf(
        [
          preparacion({
            startsOn: "2027-02-01",
            endsOn: "2027-04-04",
            duration: { amount, unit: "weeks" },
          }),
          rodaje({
            startsOn: "2027-04-05",
            endsOn: "2027-05-30",
            duration: { amount: 8, unit: "weeks" },
          }),
        ],
        [preparacionAntesDelRodaje]
      )
    api.elements.getPlan.mockResolvedValue(withWeeks(9))
    api.elements.editElement.mockResolvedValue(withWeeks(10))
    renderPage()

    await userEvent.click(
      await screen.findByRole("button", { name: "Ver el detalle de Preparación" })
    )
    let panel = screen.getByRole("dialog", { name: "Preparación" })
    // En «Cuándo»: una semana más y Aplicar, que la suma al borrador.
    const oneMore = async () => {
      await userEvent.click(within(panel).getByRole("button", { name: /^Cuándo:/ }))
      await userEvent.click(screen.getByRole("button", { name: "Una unidad más" }))
      await userEvent.click(screen.getByRole("button", { name: "Aplicar" }))
    }
    expect(within(panel).getByText("Sin cambios")).toBeInTheDocument()

    await oneMore()
    expect(within(panel).getByText("1 cambio sin guardar")).toBeInTheDocument()
    expect(api.elements.editElement).not.toHaveBeenCalled()
    expect(api.elements.updatePlan).not.toHaveBeenCalled()

    // Cancelar descarta y cierra el panel, sin preguntar; al volver, está como se guardó.
    await userEvent.click(within(panel).getByRole("button", { name: "Cancelar" }))
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Preparación" })).toBeNull())
    expect(screen.queryByRole("alertdialog")).toBeNull()
    await userEvent.click(screen.getByRole("button", { name: "Ver el detalle de Preparación" }))
    panel = await screen.findByRole("dialog", { name: "Preparación" })
    expect(within(panel).getByText("Sin cambios")).toBeInTheDocument()

    // Salir con cambios pregunta; «Seguir editando» los conserva.
    await oneMore()
    await userEvent.keyboard("{Escape}")
    const ask = await screen.findByRole("alertdialog", { name: "¿Descartar los cambios?" })
    expect(ask).toHaveTextContent("1 cambio sin guardar en “Preparación”")
    await userEvent.click(within(ask).getByRole("button", { name: "Seguir editando" }))
    expect(within(panel).getByText("1 cambio sin guardar")).toBeInTheDocument()

    await userEvent.click(within(panel).getByRole("button", { name: "Guardar" }))
    // Guardar envía el formulario, que se valida antes: la llamada llega después del clic.
    await waitFor(() =>
      expect(api.elements.editElement).toHaveBeenCalledWith("preparacion", {
        duration: { amount: 10, unit: "weeks" },
      })
    )
    expect(await within(panel).findByText("Sin cambios")).toBeInTheDocument()

    // Descartar cierra el panel sin guardar nada más.
    await oneMore()
    await userEvent.click(within(panel).getByRole("button", { name: "Elemento siguiente" }))
    await userEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Descartar" })
    )
    expect(await screen.findByRole("dialog", { name: "Rodaje" })).toBeInTheDocument()
    expect(api.elements.editElement).toHaveBeenCalledTimes(1)
  }, 15_000)

  it("una acción se borra desde su panel y el panel se cierra", async () => {
    const lectura = element("lectura", "rodaje", "Lectura de guion", {
      kind: "meeting",
      startsOn: "2027-04-07",
    })
    api.elements.getPlan.mockResolvedValue(
      planOf([rodaje({ startsOn: "2027-04-05", endsOn: "2027-05-16" }), lectura])
    )
    api.elements.deleteElement.mockResolvedValue(
      planOf([rodaje({ startsOn: "2027-04-05", endsOn: "2027-05-16" })])
    )
    renderPage()

    await userEvent.click(await screen.findByRole("button", { name: "Desplegar Rodaje" }))
    await userEvent.click(await screen.findByRole("button", { name: /Lectura de guion/ }))
    const panel = await screen.findByRole("dialog", { name: "Lectura de guion" })
    await userEvent.click(within(panel).getByRole("button", { name: "Borrar" }))
    await userEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Borrar" })
    )

    expect(api.elements.deleteElement).toHaveBeenCalledWith("lectura")
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
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
