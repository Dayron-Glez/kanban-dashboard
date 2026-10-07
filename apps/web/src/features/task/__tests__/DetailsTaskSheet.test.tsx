import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { BoardTask } from "@/features/board/types/board.types"
import { createFakeApi, createWrapper } from "@/shared/api/testing"
import { DetailsTaskSheet } from "../components/DetailsTaskSheet"

const wrapper = createWrapper(createFakeApi())

const tarea = (over: Partial<BoardTask> = {}): BoardTask => ({
  id: "t1",
  content: "Brief para la agencia",
  priority: "p2",
  size: "s",
  dueDate: null,
  columnId: "c1",
  projectId: "p1",
  position: 0,
  assigneeId: null,
  assignee: null,
  ...over,
})

const campoFecha = () => screen.getByRole("button", { name: "Fecha de vencimiento" })

describe("DetailsTaskSheet", () => {
  it("muestra la fecha de vencimiento de la tarea", () => {
    render(<DetailsTaskSheet task={tarea({ dueDate: "2026-09-20" })} open />, { wrapper })
    expect(campoFecha()).toHaveTextContent("20 de septiembre de 2026")
  })

  it("dice «Sin fecha» cuando la tarea no tiene", () => {
    render(<DetailsTaskSheet task={tarea()} open />, { wrapper })
    expect(campoFecha()).toHaveTextContent("Sin fecha")
  })

  it("refleja los cambios de la tarea sin volver a montarse", () => {
    // La regresión: el sheet vive siempre montado dentro de la tarjeta y
    // useForm solo lee defaultValues al montar, así que tras editar una tarea
    // el detalle seguía mostrando los valores viejos.
    const { rerender } = render(<DetailsTaskSheet task={tarea()} open />, { wrapper })
    expect(campoFecha()).toHaveTextContent("Sin fecha")

    rerender(<DetailsTaskSheet task={tarea({ dueDate: "2026-09-20" })} open />)
    expect(campoFecha()).toHaveTextContent("20 de septiembre de 2026")
  })

  it("también resincroniza el resto de campos", () => {
    const { rerender } = render(<DetailsTaskSheet task={tarea()} open />, { wrapper })
    expect(screen.getByDisplayValue("Brief para la agencia")).toBeInTheDocument()

    rerender(<DetailsTaskSheet task={tarea({ content: "Brief revisado" })} open />)
    expect(screen.getByDisplayValue("Brief revisado")).toBeInTheDocument()
  })
})
