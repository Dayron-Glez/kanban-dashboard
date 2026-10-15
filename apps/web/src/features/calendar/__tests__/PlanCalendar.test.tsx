import { useState } from "react"
import type { CalendarElement } from "@repo/contracts"
import { fromIsoDate, toIsoDate } from "@repo/domain"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
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

describe("PlanCalendar", () => {
  it("un periodo: el primer clic es el inicio y el segundo, el fin, en cualquier orden", async () => {
    const onChange = vi.fn()
    render(<Range onChange={onChange} />)

    expect(screen.getByText("Pulsa el inicio y el fin")).toBeInTheDocument()
    await userEvent.click(day("2026-11-05"))
    expect(screen.getByText("Elige el día de fin")).toBeInTheDocument()
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
