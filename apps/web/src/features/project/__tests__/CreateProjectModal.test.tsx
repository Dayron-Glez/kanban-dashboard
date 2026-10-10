import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { CreateProjectModal } from "../components/CreateProjectModal"

describe("CreateProjectModal", () => {
  it("crea el proyecto como cine si no se elige otro tipo", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<CreateProjectModal open onOpenChange={() => {}} onSubmit={onSubmit} />)

    expect(screen.getByRole("combobox", { name: "Tipo" })).toHaveTextContent("Cine")
    await userEvent.type(screen.getByLabelText("Nombre"), "Largometraje")
    await userEvent.click(screen.getByRole("button", { name: "Crear proyecto" }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Largometraje", kind: "film" })
    )
  })
})
