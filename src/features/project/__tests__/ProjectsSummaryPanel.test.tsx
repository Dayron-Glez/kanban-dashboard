import { render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ProjectsSummaryPanel } from "../components/ProjectsSummaryPanel"

vi.mock("@/shared", () => ({
  Separator: () => <hr />,
}))

const baseProject = { color: "#000", owner_id: "u1", description: null, created_at: "" }

vi.mock("../context/projectsCtx", () => ({
  useProjectsContext: () => ({
    projects: [
      { ...baseProject, id: "p1", name: "Alpha" },
      { ...baseProject, id: "p2", name: "Beta" },
      { ...baseProject, id: "p3", name: "Gamma" },
    ],
    userRoles: { p1: "owner", p2: "owner", p3: "member" },
    taskCounts: { p1: 5, p2: 3, p3: 2 },
    priorityCounts: {
      p1: { p0: 2, p1: 1, p2: 0 },
      p2: { p0: 0, p1: 2, p2: 1 },
      // p3 sin entrada: el panel debe tolerarlo
    },
    favoriteIds: { p1: true },
  }),
}))

describe("ProjectsSummaryPanel", () => {
  it("agrega proyectos con desglose de propios y compartidos", () => {
    render(<ProjectsSummaryPanel />)
    const row = screen.getByText("Proyectos").closest("div")!.parentElement!
    expect(within(row).getByText("3")).toBeInTheDocument()
    expect(screen.getByText("2 propios · 1 compartido")).toBeInTheDocument()
  })

  it("suma las tareas de todos los proyectos", () => {
    render(<ProjectsSummaryPanel />)
    expect(screen.getByText("Tareas totales")).toBeInTheDocument()
    expect(screen.getByText("10")).toBeInTheDocument()
  })

  it("cuenta los favoritos", () => {
    render(<ProjectsSummaryPanel />)
    expect(screen.getByText("Favoritos")).toBeInTheDocument()
  })

  it("agrega las prioridades tolerando proyectos sin conteo", () => {
    render(<ProjectsSummaryPanel />)
    const p0 = screen.getByRole("progressbar", { name: "Tareas P0" })
    const p1 = screen.getByRole("progressbar", { name: "Tareas P1" })
    const p2 = screen.getByRole("progressbar", { name: "Tareas P2" })
    expect(p0).toHaveAttribute("aria-valuenow", "2")
    expect(p1).toHaveAttribute("aria-valuenow", "3")
    expect(p2).toHaveAttribute("aria-valuenow", "1")
  })
})
