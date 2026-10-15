import { useState } from "react"
import type { CalendarElement } from "@repo/contracts"
import { fromIsoDate, toIsoDate } from "@repo/domain"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, describe, expect, it, vi } from "vitest"
import { PlanCalendar, type CalendarValue } from "../components/PlanCalendar"

const day = (iso: string) => document.querySelector(`[data-day="${iso}"] button`) as HTMLElement
const action = (name: string, kind: CalendarElement["kind"]): CalendarElement => ({
  id: name,
  projectId: "p",
  kind,
  parentId: "softpre",
  position: 0,
  name,
  color: null,
  templateKey: null,
  duration: { amount: 1, unit: "days" },
  startsOn: "2026-10-14",
  endsOn: null,
  isAnchor: false,
  isPinned: false,
  issue: null,
})
const iso = (value: CalendarValue) => ({
  start: value.start != null ? toIsoDate(value.start) : null,
  end: value.end != null ? toIsoDate(value.end) : null,
})

function Range({ onChange }: Readonly<{ onChange: (value: CalendarValue) => void }>) {
  const [value, setValue] = useState<CalendarValue>({ start: null, end: null })
  return (
    <PlanCalendar
      mode="range"
      numberOfMonths={2}
      defaultMonth={fromIsoDate("2026-10-01")}
      value={value}
      onChange={(next) => {
        setValue(next)
        onChange(next)
      }}
    />
  )
}

// El Select de Radix usa la captura del puntero y scrollIntoView, que jsdom no tiene.
beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.releasePointerCapture ??= () => {}
  Element.prototype.scrollIntoView ??= () => {}
})

describe("PlanCalendar", () => {
  it("un periodo: el primer clic es el inicio y el segundo, el fin, en cualquier orden", async () => {
    const onChange = vi.fn()
    render(<Range onChange={onChange} />)

    expect(screen.getByText("Pulsa el día de inicio y el de fin")).toBeInTheDocument()
    await userEvent.click(day("2026-11-05"))
    expect(screen.getByText("Ahora, el día de fin")).toBeInTheDocument()
    await userEvent.click(day("2026-10-20"))

    expect(iso(onChange.mock.lastCall![0])).toEqual({ start: "2026-10-20", end: "2026-11-05" })
  })

  it("enseña dos meses y se mueve con las flechas", async () => {
    render(<Range onChange={() => {}} />)
    expect(screen.getByText("octubre 2026")).toBeInTheDocument()
    expect(screen.getByText("noviembre 2026")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Mes siguiente" }))
    expect(screen.queryByText("octubre 2026")).toBeNull()
    expect(screen.getByText("diciembre 2026")).toBeInTheDocument()
  })

  it("se salta a cualquier mes y año con sus selectores", async () => {
    render(<Range onChange={() => {}} />)

    await userEvent.click(screen.getByRole("combobox", { name: "Año" }))
    await userEvent.click(screen.getByRole("option", { name: "2028" }))
    await userEvent.click(screen.getByRole("combobox", { name: "Mes" }))
    await userEvent.click(screen.getByRole("option", { name: "marzo" }))

    expect(screen.getByText("marzo 2028")).toBeInTheDocument()
    expect(screen.getByText("abril 2028")).toBeInTheDocument()
  })

  it("fuera de lo que dibuja el Gantt, los días, los meses y las flechas se apagan", async () => {
    const onChange = vi.fn()
    render(
      <PlanCalendar
        mode="single"
        defaultMonth={fromIsoDate("2026-01-01")}
        bounds={{ start: fromIsoDate("2026-05-21"), end: fromIsoDate("2026-06-10") }}
        value={{ start: null, end: null }}
        onChange={onChange}
      />
    )
    // Abre en el primer mes del plan, aunque se pidiera uno anterior.
    expect(screen.getByRole("button", { name: "Mes anterior" })).toBeDisabled()
    expect(day("2026-05-20")).toBeDisabled()
    await userEvent.click(day("2026-05-21"))
    expect(iso(onChange.mock.lastCall![0]).start).toBe("2026-05-21")

    await userEvent.click(screen.getByRole("button", { name: "Mes siguiente" }))
    expect(day("2026-06-11")).toBeDisabled()
    expect(screen.getByRole("button", { name: "Mes siguiente" })).toBeDisabled()

    await userEvent.click(screen.getByRole("combobox", { name: "Mes" }))
    expect(screen.getByRole("option", { name: "julio" })).toHaveAttribute("aria-disabled", "true")
    expect(screen.getByRole("option", { name: "mayo" })).not.toHaveAttribute("aria-disabled")
  })

  it("un día: un solo clic basta", async () => {
    const onChange = vi.fn()
    render(
      <PlanCalendar
        mode="single"
        defaultMonth={fromIsoDate("2026-10-01")}
        value={{ start: null, end: null }}
        onChange={onChange}
      />
    )
    await userEvent.click(day("2026-10-14"))
    expect(iso(onChange.mock.lastCall![0])).toEqual({ start: "2026-10-14", end: "2026-10-14" })
  })

  it("los días con acciones llevan puntos y, al pasar por encima, la lista de la celda", async () => {
    render(
      <PlanCalendar
        mode="single"
        defaultMonth={fromIsoDate("2026-10-01")}
        value={{ start: null, end: null }}
        onChange={() => {}}
        occupancy={{
          scope: "SoftPre",
          days: {
            "2026-10-14": [
              { element: action("Lectura de guion", "meeting"), owner: null },
              { element: action("Casting", "task"), owner: "Localizaciones" },
            ],
          },
        }}
      />
    )
    expect(day("2026-10-14").querySelectorAll(".rounded-full")).toHaveLength(2)

    await userEvent.hover(day("2026-10-14"))
    const list = await screen.findByRole("list", { name: "Acciones de la celda" })
    expect(list).toHaveTextContent("Lectura de guion")
    expect(list).toHaveTextContent("Localizaciones")
    expect(screen.getByText("en SoftPre")).toBeInTheDocument()
  })
})
