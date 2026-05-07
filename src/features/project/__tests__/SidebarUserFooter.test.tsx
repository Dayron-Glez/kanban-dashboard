import { type ReactNode } from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { SidebarUserFooter } from "../components/SidebarUserFooter"

const mockNavigate = vi.fn()
vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
}))

const mockSignOut = vi.fn()
vi.mock("@/features/auth", () => ({
  useAuth: () => ({
    user: {
      email: "ana@empresa.com",
      user_metadata: { full_name: "Ana García" },
    },
    signOut: mockSignOut,
  }),
}))

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

describe("SidebarUserFooter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOpen = true
  })

  it("muestra las iniciales del usuario en el avatar", () => {
    render(<SidebarUserFooter />)
    expect(screen.getByText("AG")).toBeInTheDocument()
  })

  it("muestra el nombre completo del usuario", () => {
    render(<SidebarUserFooter />)
    expect(screen.getByText("Ana García")).toBeInTheDocument()
  })

  it("muestra el email del usuario", () => {
    render(<SidebarUserFooter />)
    expect(screen.getByText("ana@empresa.com")).toBeInTheDocument()
  })

  it("llama signOut y navega a /login al pulsar logout", async () => {
    mockSignOut.mockResolvedValue(undefined)
    render(<SidebarUserFooter />)
    fireEvent.click(screen.getByTitle("Cerrar sesión"))
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledOnce()
      expect(mockNavigate).toHaveBeenCalledWith("/login")
    })
  })

  it("llama toggleSidebar al pulsar Colapsar", () => {
    render(<SidebarUserFooter />)
    fireEvent.click(screen.getByText(/Colapsar/))
    expect(mockToggleSidebar).toHaveBeenCalledOnce()
  })

  it("solo muestra el avatar cuando el sidebar está colapsado", () => {
    mockOpen = false
    render(<SidebarUserFooter />)
    expect(screen.getByText("AG")).toBeInTheDocument()
    expect(screen.queryByText("Ana García")).not.toBeInTheDocument()
    expect(screen.queryByText(/Colapsar/)).not.toBeInTheDocument()
  })
})
