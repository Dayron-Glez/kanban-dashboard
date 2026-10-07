import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, describe, expect, it, vi } from "vitest"
import type { BoardTask } from "@/features/board/types/board.types"

// Los sheets de edición y detalle montan TaskForm, cuyo AssigneeSelect lee los
// miembros del tablero. Se simula el fichero del hook y no el barril: el barril
// se importa en ciclo desde TaskCard y recibiría el original.
vi.mock("@/features/board/hooks/useKanban", () => ({ useKanban: () => ({ members: [] }) }))

const { TaskCard } = await import("../components/TaskCard/TaskCard")

// El menú de Radix se posiciona con APIs que jsdom no implementa.
beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.releasePointerCapture ??= () => {}
  Element.prototype.scrollIntoView ??= () => {}
})

const tarea = (over: Partial<BoardTask> = {}): BoardTask => ({
  id: "t1",
  content: "Brief para la agencia",
  priority: "p0",
  size: "m",
  dueDate: null,
  columnId: "c1",
  projectId: "p1",
  position: 0,
  assigneeId: null,
  assignee: null,
  ...over,
})

const renderCard = (task = tarea()) => {
  const deleteTask = vi.fn()
  const updateTask = vi.fn()
  render(<TaskCard task={task} deleteTask={deleteTask} updateTask={updateTask} />)
  return { deleteTask, updateTask, user: userEvent.setup() }
}

const openMenuItem = async (user: ReturnType<typeof userEvent.setup>, item: string) => {
  await user.click(screen.getByRole("button", { name: "Abrir menú de acciones" }))
  await user.click(await screen.findByRole("menuitem", { name: item }))
}

describe("TaskCard", () => {
  it("muestra el título, la prioridad y el tamaño", () => {
    renderCard()
    expect(screen.getByText("Brief para la agencia")).toBeInTheDocument()
    expect(screen.getByText("P0")).toBeInTheDocument()
    expect(screen.getByText("M")).toBeInTheDocument()
  })

  it("muestra las iniciales del asignado", () => {
    renderCard(
      tarea({ assignee: { id: "u1", fullName: "Ana García", avatarUrl: null, email: "ana@x.com" } })
    )
    expect(screen.getByText("AG")).toBeInTheDocument()
  })

  it("usa una interrogación si el asignado no tiene nombre", () => {
    renderCard(tarea({ assignee: { id: "u1", fullName: null, avatarUrl: null, email: null } }))
    expect(screen.getByText("?")).toBeInTheDocument()
  })

  it("abre el detalle desde el menú", async () => {
    const { user } = renderCard()
    await openMenuItem(user, "Ver Detalles")
    expect(await screen.findByRole("dialog", { name: "Detalles de la tarea" })).toBeInTheDocument()
  })

  it("abre la edición desde el menú", async () => {
    const { user } = renderCard()
    await openMenuItem(user, "Editar Tarea")
    expect(await screen.findByRole("dialog", { name: "Editar Tarea" })).toBeInTheDocument()
  })

  it("borra la tarea con su id al confirmar", async () => {
    const { user, deleteTask } = renderCard()
    await openMenuItem(user, "Eliminar Tarea")

    const dialog = await screen.findByRole("alertdialog", { name: "¿Eliminar Tarea?" })
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }))

    expect(deleteTask).toHaveBeenCalledExactlyOnceWith("t1")
  })

  it("no borra nada al cancelar", async () => {
    const { user, deleteTask } = renderCard()
    await openMenuItem(user, "Eliminar Tarea")

    const dialog = await screen.findByRole("alertdialog", { name: "¿Eliminar Tarea?" })
    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }))

    expect(deleteTask).not.toHaveBeenCalled()
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  })
})
