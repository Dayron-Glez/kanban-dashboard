import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { type ReactNode } from "react"
import { SidebarProjectList } from "../components/SidebarProjectList"

vi.mock("react-router", () => ({
  Link: ({ to, children, className }: { to: string; children: ReactNode; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}))

vi.mock("@/shared", () => ({
  SidebarGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SidebarGroupLabel: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  SidebarGroupContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SidebarMenu: ({ children }: { children: ReactNode }) => <ul>{children}</ul>,
  SidebarMenuItem: ({ children }: { children: ReactNode }) => <li>{children}</li>,
  Button: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}))

const projects = [
  {
    id: "p1",
    name: "Proyecto Alpha",
    color: "#3b82f6",
    owner_id: "u1",
    description: null,
    created_at: "",
  },
  {
    id: "p2",
    name: "Marketing Q2",
    color: "#ef4444",
    owner_id: "u1",
    description: null,
    created_at: "",
  },
]
const taskCounts = { p1: 24, p2: 18 }

describe("SidebarProjectList", () => {
  it("muestra proyectos en la lista", () => {
    render(
      <SidebarProjectList
        projects={projects}
        taskCounts={taskCounts}
        activeProjectId={undefined}
        onCreateProject={vi.fn()}
      />
    )
    expect(screen.getByText("Proyecto Alpha")).toBeInTheDocument()
    expect(screen.getByText("Marketing Q2")).toBeInTheDocument()
  })

  it("filtra proyectos al escribir en el buscador", () => {
    render(
      <SidebarProjectList
        projects={projects}
        taskCounts={taskCounts}
        activeProjectId={undefined}
        onCreateProject={vi.fn()}
      />
    )
    const input = screen.getByPlaceholderText("Buscar proyecto...")
    fireEvent.change(input, { target: { value: "Marketing" } })
    expect(screen.getByText("Marketing Q2")).toBeInTheDocument()
    expect(screen.queryByText("Proyecto Alpha")).not.toBeInTheDocument()
  })

  it('muestra "Sin resultados" cuando no hay coincidencias', () => {
    render(
      <SidebarProjectList
        projects={projects}
        taskCounts={taskCounts}
        activeProjectId={undefined}
        onCreateProject={vi.fn()}
      />
    )
    const input = screen.getByPlaceholderText("Buscar proyecto...")
    fireEvent.change(input, { target: { value: "xyz" } })
    expect(screen.getByText("Sin resultados")).toBeInTheDocument()
  })

  it("llama onCreateProject al pulsar Nuevo", () => {
    const onCreateProject = vi.fn()
    render(
      <SidebarProjectList
        projects={projects}
        taskCounts={taskCounts}
        activeProjectId={undefined}
        onCreateProject={onCreateProject}
      />
    )
    fireEvent.click(screen.getByText(/Nuevo/))
    expect(onCreateProject).toHaveBeenCalledOnce()
  })

  it("muestra el contador de tareas junto a cada proyecto", () => {
    render(
      <SidebarProjectList
        projects={projects}
        taskCounts={taskCounts}
        activeProjectId={undefined}
        onCreateProject={vi.fn()}
      />
    )
    expect(screen.getByText("24")).toBeInTheDocument()
    expect(screen.getByText("18")).toBeInTheDocument()
  })

  it("aplica estilos de activo al proyecto seleccionado", () => {
    render(
      <SidebarProjectList
        projects={projects}
        taskCounts={taskCounts}
        activeProjectId="p1"
        onCreateProject={vi.fn()}
      />
    )
    const alphaLink = screen.getByText("Proyecto Alpha").closest("a")
    expect(alphaLink?.className).toContain("font-medium")
    expect(alphaLink?.className).toContain("text-primary")
    const marketingLink = screen.getByText("Marketing Q2").closest("a")
    expect(marketingLink?.className).not.toContain("font-medium")
  })
})
