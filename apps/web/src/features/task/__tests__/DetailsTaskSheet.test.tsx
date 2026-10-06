import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { Task } from "@/features/board/types/board.types"

// TaskForm arrastra AssigneeSelect, que lee los miembros de useKanban. Aquí no
// hay tablero, y los miembros no son lo que se está probando.
vi.mock("@/features/board/index", () => ({ useKanban: () => ({ members: [] }) }))

const { DetailsTaskSheet } = await import("../components/DetailsTaskSheet")

const tarea = (over: Partial<Task> = {}): Task => ({
  id: "t1",
  content: "Brief para la agencia",
  priority: "p2",
  size: "s",
  due_date: null,
  columnId: "c1",
  project_id: "p1",
  position: 0,
  assignee_id: null,
  assigneeProfile: null,
  ...over,
})

const campoFecha = () => screen.getByRole("button", { name: "Fecha de vencimiento" })

describe("DetailsTaskSheet", () => {
  it("muestra la fecha de vencimiento de la tarea", () => {
    render(<DetailsTaskSheet task={tarea({ due_date: "2026-09-20" })} open />)
    expect(campoFecha()).toHaveTextContent("20 de septiembre de 2026")
  })

  it("dice «Sin fecha» cuando la tarea no tiene", () => {
    render(<DetailsTaskSheet task={tarea()} open />)
    expect(campoFecha()).toHaveTextContent("Sin fecha")
  })

  it("refleja los cambios de la tarea sin volver a montarse", () => {
    // La regresión: el sheet vive siempre montado dentro de la tarjeta y
    // useForm solo lee defaultValues al montar, así que tras editar una tarea
    // el detalle seguía mostrando los valores viejos.
    const { rerender } = render(<DetailsTaskSheet task={tarea()} open />)
    expect(campoFecha()).toHaveTextContent("Sin fecha")

    rerender(<DetailsTaskSheet task={tarea({ due_date: "2026-09-20" })} open />)
    expect(campoFecha()).toHaveTextContent("20 de septiembre de 2026")
  })

  it("también resincroniza el resto de campos", () => {
    const { rerender } = render(<DetailsTaskSheet task={tarea()} open />)
    expect(screen.getByDisplayValue("Brief para la agencia")).toBeInTheDocument()

    rerender(<DetailsTaskSheet task={tarea({ content: "Brief revisado" })} open />)
    expect(screen.getByDisplayValue("Brief revisado")).toBeInTheDocument()
  })
})
