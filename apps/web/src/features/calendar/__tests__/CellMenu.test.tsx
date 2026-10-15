import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { fromIsoDate } from "@repo/domain"
import { describe, expect, it } from "vitest"
import { CellMenu } from "../components/CellMenu"

const day = fromIsoDate("2026-10-16")

const renderMenu = () =>
  render(
    <CellMenu
      start={day}
      end={day + 2}
      parentName="Recce"
      actions={[]}
      canCreate
      pending={false}
      onOpen={() => {}}
      onCreate={() => {}}
      onCancel={() => {}}
    />
  )

describe("CellMenu", () => {
  it.each([
    ["Viaje", "Nuevo viaje"],
    ["Evento", "Nuevo evento"],
    ["Contratación", "Nueva contratación"],
    ["Tarea", "Nueva tarea"],
  ])("el formulario de %s se titula «%s»", async (kind, title) => {
    renderMenu()
    const menu = screen.getByRole("menu", { name: "Tipo de acción" })
    await userEvent.click(within(menu).getByRole("menuitem", { name: new RegExp(kind) }))
    expect(screen.getByText(title)).toBeInTheDocument()
  })
})
