import { type ReactNode } from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { UserMenu } from "../components/UserMenu"
import { getInitials } from "../lib/initials"

const mockNavigate = vi.fn()
vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
}))

const mockSignOut = vi.fn()
vi.mock("../context/useAuth", () => ({
  useAuth: () => ({
    user: {
      email: "ana@empresa.com",
      user_metadata: { full_name: "Ana García" },
    },
    signOut: mockSignOut,
  }),
}))

// El menú se renderiza siempre abierto para poder asertar su contenido sin
// depender del portal ni de la animación de Radix.
vi.mock("@/shared", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuItem: ({ children, onSelect }: { children: ReactNode; onSelect?: () => void }) => (
    <button onClick={onSelect}>{children}</button>
  ),
}))

describe("getInitials", () => {
  it("toma la inicial del nombre y del apellido", () => {
    expect(getInitials("Ana García", undefined)).toBe("AG")
  })

  it("toma las dos primeras letras si solo hay un nombre", () => {
    expect(getInitials("Ana", undefined)).toBe("AN")
  })

  it("cae al email cuando no hay nombre", () => {
    expect(getInitials(undefined, "zoe@empresa.com")).toBe("ZO")
  })

  it("devuelve ? sin nombre ni email", () => {
    expect(getInitials(undefined, undefined)).toBe("?")
  })
})

describe("UserMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("muestra las iniciales del usuario en el avatar", () => {
    render(<UserMenu />)
    expect(screen.getByText("AG")).toBeInTheDocument()
  })

  it("muestra el nombre completo y el email", () => {
    render(<UserMenu />)
    expect(screen.getByText("Ana García")).toBeInTheDocument()
    expect(screen.getByText("ana@empresa.com")).toBeInTheDocument()
  })

  it("llama signOut y navega a /login al cerrar sesión (en ese orden)", async () => {
    mockSignOut.mockResolvedValue(undefined)
    render(<UserMenu />)
    fireEvent.click(screen.getByText("Cerrar sesión"))
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledOnce())
    expect(mockNavigate).toHaveBeenCalledWith("/login")
  })
})
