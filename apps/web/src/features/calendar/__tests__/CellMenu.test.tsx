import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { fromIsoDate } from "@repo/domain"
import { describe, expect, it, vi } from "vitest"
import { CellMenu } from "../components/CellMenu"

const day = fromIsoDate("2026-10-16")

const renderMenu = (end = day + 2) => {
  const onNewAction = vi.fn()
  render(
    <CellMenu
      start={day}
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
})
