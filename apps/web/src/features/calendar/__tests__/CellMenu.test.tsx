import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { fromIsoDate } from "@repo/domain"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { CellMenu } from "../components/CellMenu"

const day = fromIsoDate("2026-10-16")

// Hoy es el 14 de octubre de 2026.
beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 9, 14) })
})
afterAll(() => {
  vi.useRealTimers()
})

const renderMenu = (end = day + 2, start = day) => {
  const onNewAction = vi.fn()
  render(
    <CellMenu
      start={start}
      end={end}
      parentName="Recce"
      actions={[]}
      canCreate
      onOpen={() => {}}
      onNewAction={onNewAction}
    />
  )
  return onNewAction
}

describe("CellMenu", () => {
  it("elegir el tipo pide la acción nueva con el periodo, sin pedir el nombre", async () => {
    const onNewAction = renderMenu()
    const menu = screen.getByRole("menu", { name: "Tipo de acción" })
    await userEvent.click(within(menu).getByRole("menuitem", { name: /Viaje/ }))
    expect(onNewAction).toHaveBeenCalledWith({
      kind: "travel",
      startsOn: "2026-10-16",
      endsOn: "2026-10-18",
    })
    expect(screen.queryByRole("textbox")).toBeNull()
  })

  it("en un solo día, sin fin; en un periodo, reunión y recordatorio no se ofrecen", async () => {
    const onNewAction = renderMenu(day)
    await userEvent.click(screen.getByRole("menuitem", { name: /Reunión/ }))
    expect(onNewAction).toHaveBeenCalledWith({
      kind: "meeting",
      startsOn: "2026-10-16",
      endsOn: null,
    })
  })

  it("no se planifica hacia atrás: lo que empieza antes de hoy se crea desde hoy", async () => {
    const onNewAction = renderMenu(day, fromIsoDate("2026-10-12"))
    expect(screen.getByText("Crear del 14 oct al 16 oct")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("menuitem", { name: /Tarea/ }))
    expect(onNewAction).toHaveBeenCalledWith({
      kind: "task",
      startsOn: "2026-10-14",
      endsOn: "2026-10-16",
    })
  })

  it("en días ya pasados no se crea nada, y lo dice", () => {
    renderMenu(fromIsoDate("2026-10-13"), fromIsoDate("2026-10-12"))
    expect(screen.queryByRole("menu", { name: "Tipo de acción" })).toBeNull()
    expect(screen.getByText("Antes de hoy no se crean acciones.")).toBeInTheDocument()
  })
})
