import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { SidebarProjectCard } from "../components/SidebarProjectCard"

vi.mock("react-router", () => ({
  Link: ({
    to,
    children,
    className,
  }: {
    to: string
    children: React.ReactNode
    className?: string
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}))

const project = {
  id: "p1",
  name: "Proyecto Alpha",
  color: "#3b82f6",
  owner_id: "u1",
  description: null,
  created_at: new Date().toISOString(),
}

describe("SidebarProjectCard", () => {
  it("muestra la inicial del nombre", () => {
    render(<SidebarProjectCard project={project} taskCount={5} />)
    expect(screen.getByText("P")).toBeInTheDocument()
  })

  it("muestra el nombre del proyecto", () => {
    render(<SidebarProjectCard project={project} taskCount={5} />)
    expect(screen.getByText("Proyecto Alpha")).toBeInTheDocument()
  })

  it('muestra "N tareas" para taskCount > 1', () => {
    render(<SidebarProjectCard project={project} taskCount={24} />)
    expect(screen.getByText("24 tareas")).toBeInTheDocument()
  })

  it('muestra "1 tarea" para taskCount === 1', () => {
    render(<SidebarProjectCard project={project} taskCount={1} />)
    expect(screen.getByText("1 tarea")).toBeInTheDocument()
  })
})
