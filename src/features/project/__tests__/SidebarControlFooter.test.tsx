import { type ReactNode } from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { SidebarControlFooter } from "../components/SidebarControlFooter"

// El menú se renderiza siempre abierto para poder asertar su contenido sin
// depender del portal ni de la animación de Radix.
vi.mock("@/shared", () => ({
  SidebarFooter: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  Button: ({
    children,
    "aria-label": ariaLabel,
  }: {
    children: ReactNode
    "aria-label"?: string
  }) => <button aria-label={ariaLabel}>{children}</button>,
  Tooltip: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: () => null,
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuItem: ({ children, onSelect }: { children: ReactNode; onSelect?: () => void }) => (
    <button onClick={onSelect}>{children}</button>
  ),
}))

describe("SidebarControlFooter", () => {
  const onModeChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("muestra el disparador accesible por su etiqueta", () => {
    render(<SidebarControlFooter mode="expanded" onModeChange={onModeChange} />)
    expect(screen.getByLabelText("Control del sidebar")).toBeInTheDocument()
  })

  it("muestra las tres opciones del control", () => {
    render(<SidebarControlFooter mode="expanded" onModeChange={onModeChange} />)
    expect(screen.getByText("Expandido")).toBeInTheDocument()
    expect(screen.getByText("Contraído")).toBeInTheDocument()
    expect(screen.getByText("Expandir al pasar el cursor")).toBeInTheDocument()
  })

  it("marca únicamente el modo activo", () => {
    render(<SidebarControlFooter mode="hover" onModeChange={onModeChange} />)
    expect(screen.getByTestId("modo-activo-hover")).toBeInTheDocument()
    expect(screen.queryByTestId("modo-activo-expanded")).not.toBeInTheDocument()
    expect(screen.queryByTestId("modo-activo-collapsed")).not.toBeInTheDocument()
  })

  it("notifica el cambio a contraído", () => {
    render(<SidebarControlFooter mode="expanded" onModeChange={onModeChange} />)
    fireEvent.click(screen.getByText("Contraído"))
    expect(onModeChange).toHaveBeenCalledWith("collapsed")
  })

  it("notifica el cambio a expandir al pasar el cursor", () => {
    render(<SidebarControlFooter mode="collapsed" onModeChange={onModeChange} />)
    fireEvent.click(screen.getByText("Expandir al pasar el cursor"))
    expect(onModeChange).toHaveBeenCalledWith("hover")
  })
})
