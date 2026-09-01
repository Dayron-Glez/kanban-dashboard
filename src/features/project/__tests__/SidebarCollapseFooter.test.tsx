import { type ReactNode } from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { SidebarCollapseFooter } from "../components/SidebarCollapseFooter"

const mockToggleSidebar = vi.fn()
let mockOpen = true

vi.mock("@/shared", () => ({
  useSidebar: () => ({ open: mockOpen, toggleSidebar: mockToggleSidebar }),
  SidebarFooter: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  Button: ({
    children,
    onClick,
    title,
  }: {
    children: ReactNode
    onClick?: () => void
    title?: string
  }) => (
    <button onClick={onClick} title={title}>
      {children}
    </button>
  ),
}))

describe("SidebarCollapseFooter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOpen = true
  })

  it("llama toggleSidebar al pulsar Colapsar", () => {
    render(<SidebarCollapseFooter />)
    fireEvent.click(screen.getByText(/Colapsar/))
    expect(mockToggleSidebar).toHaveBeenCalledOnce()
  })

  it("colapsado muestra solo el botón de expandir, sin la etiqueta", () => {
    mockOpen = false
    render(<SidebarCollapseFooter />)
    expect(screen.getByTitle("Expandir sidebar")).toBeInTheDocument()
    expect(screen.queryByText(/Colapsar/)).not.toBeInTheDocument()
  })

  it("ya no renderiza los datos de la cuenta, que viven en la barra superior", () => {
    render(<SidebarCollapseFooter />)
    expect(screen.queryByTitle("Cerrar sesión")).not.toBeInTheDocument()
  })
})
