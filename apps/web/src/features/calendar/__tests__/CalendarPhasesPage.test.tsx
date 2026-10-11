import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { CalendarElement, ProjectSummary } from "@repo/contracts"
import { MemoryRouter, Route, Routes } from "react-router"
import { beforeEach, describe, expect, it } from "vitest"
import { createFakeApi, createWrapper } from "@/shared/api/testing"
import { CalendarPhasesPage } from "../components/CalendarPhasesPage"

const PROJECT_ID = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b"

const element = (id: string, parentId: string | null, name: string): CalendarElement => ({
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
})

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

let api: ReturnType<typeof createFakeApi>

const renderPage = () => {
  const Wrapper = createWrapper(api)
  render(
    <Wrapper>
      <MemoryRouter initialEntries={[`/projects/${PROJECT_ID}/calendar`]}>
        <Routes>
          <Route path="/projects/:id/calendar" element={<CalendarPhasesPage />} />
        </Routes>
      </MemoryRouter>
    </Wrapper>
  )
}

beforeEach(() => {
  api = createFakeApi()
  api.projects.listMine.mockResolvedValue([summary("owner")])
})

describe("CalendarPhasesPage", () => {
  it("muestra las fases abiertas y pliega sus hijos", async () => {
    api.elements.listByProject.mockResolvedValue([
      element("post", null, "Postproducción"),
      element("vfx", "post", "VFX"),
    ])
    renderPage()

    expect(await screen.findByText("VFX")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Plegar Postproducción" }))
    expect(screen.queryByText("VFX")).not.toBeInTheDocument()
  })

  it("la propietaria genera el calendario si está vacío", async () => {
    api.elements.listByProject.mockResolvedValue([])
    api.elements.generateFromTemplate.mockResolvedValue([element("dev", null, "Desarrollo")])
    renderPage()

    await userEvent.click(await screen.findByRole("button", { name: /Generar desde la plantilla/ }))

    expect(api.elements.generateFromTemplate).toHaveBeenCalledWith(PROJECT_ID)
    expect(await screen.findByText("Desarrollo")).toBeInTheDocument()
  })

  it("un miembro no ve el botón de generar", async () => {
    api.projects.listMine.mockResolvedValue([summary("member")])
    api.elements.listByProject.mockResolvedValue([])
    renderPage()

    expect(await screen.findByText(/Solo el propietario/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Generar/ })).not.toBeInTheDocument()
  })
})
