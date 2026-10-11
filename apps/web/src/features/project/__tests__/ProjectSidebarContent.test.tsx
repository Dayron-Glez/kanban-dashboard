import { render, screen, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { beforeAll, describe, expect, it, vi } from "vitest"
import { SidebarProvider } from "@/shared"
import { ProjectSidebarContent } from "../components/ProjectSidebarContent"

// jsdom no trae matchMedia, y el SidebarProvider lo usa para saber si es móvil.
beforeAll(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  )
})

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <SidebarProvider defaultOpen>
        <Routes>
          {["/projects", "/projects/:id/*"].map((route) => (
            <Route
              key={route}
              path={route}
              element={<ProjectSidebarContent mode="expanded" onModeChange={() => {}} />}
            />
          ))}
        </Routes>
      </SidebarProvider>
    </MemoryRouter>
  )

const labels = (container: HTMLElement) =>
  within(container)
    .getAllByRole("link")
    .map((link) => link.getAttribute("aria-label"))

describe("ProjectSidebarContent", () => {
  it("con un proyecto abierto, el tablero queda aparte, en «Otras vistas»", () => {
    renderAt("/projects/p1/calendar")

    const others = screen.getByText("Otras vistas").parentElement!
    expect(labels(others)).toEqual(["Tablero", "Analytics"])
    expect(screen.getAllByRole("link").map((link) => link.getAttribute("aria-label"))).toEqual([
      "Calendario",
      "Miembros",
      "Ajustes",
      "Tablero",
      "Analytics",
    ])
  })

  it("sin proyecto no hay «Otras vistas»", () => {
    renderAt("/projects")

    expect(screen.queryByText("Otras vistas")).not.toBeInTheDocument()
    expect(screen.getAllByRole("link").map((link) => link.getAttribute("aria-label"))).toEqual([
      "Inicio",
      "Proyectos",
    ])
  })
})
