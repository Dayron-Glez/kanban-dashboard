import { render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DueDateChip } from "../components/DueDateChip"

const HOY = new Date(2026, 8, 8, 13, 30) // 8 de septiembre de 2026

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(HOY)
})

afterEach(() => {
  vi.useRealTimers()
})

describe("DueDateChip", () => {
  it("no pinta nada sin fecha", () => {
    const { container } = render(<DueDateChip dueDate={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("usa la etiqueta relativa, no la fecha completa", () => {
    render(<DueDateChip dueDate="2026-09-08" />)
    expect(screen.getByText("Hoy")).toBeInTheDocument()
  })

  it("cuenta los días que faltan", () => {
    render(<DueDateChip dueDate="2026-09-11" />)
    expect(screen.getByText("En 3 días")).toBeInTheDocument()
  })

  it("cuenta los días de retraso", () => {
    render(<DueDateChip dueDate="2026-09-05" />)
    expect(screen.getByText("Hace 3 días")).toBeInTheDocument()
  })

  it("cae a fecha corta cuando queda lejos", () => {
    render(<DueDateChip dueDate="2026-10-20" />)
    expect(screen.getByText("20 oct")).toBeInTheDocument()
  })

  it("colorea según la urgencia", () => {
    const { container: atrasada } = render(<DueDateChip dueDate="2026-09-01" />)
    expect(atrasada.querySelector("span")?.className).toContain("text-destructive")

    const { container: lejana } = render(<DueDateChip dueDate="2026-12-01" />)
    expect(lejana.querySelector("span")?.className).toContain("text-foreground/75")
  })
})
