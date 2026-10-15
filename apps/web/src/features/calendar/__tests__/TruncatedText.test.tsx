import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { TruncatedText } from "../components/TruncatedText"

// jsdom no maqueta: se simula si el texto cabe o no.
const widths = (scroll: number, client: number) => {
  vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(scroll)
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(client)
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("TruncatedText", () => {
  it("si se corta, se lee entero en un Tooltip", async () => {
    widths(320, 120)
    render(<TruncatedText text="Estructuración y negociación de incentivos fiscales" />)

    await userEvent.hover(screen.getByText("Estructuración y negociación de incentivos fiscales"))
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Estructuración y negociación de incentivos fiscales"
    )
  })

  it("si cabe, no hay Tooltip", async () => {
    widths(80, 120)
    render(<TruncatedText text="Casting" />)

    await userEvent.hover(screen.getByText("Casting"))
    expect(screen.queryByRole("tooltip")).toBeNull()
  })
})
