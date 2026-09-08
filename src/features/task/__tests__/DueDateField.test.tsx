import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useForm, FormProvider } from "react-hook-form"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DueDateField } from "../components/TaskForm/DueDateField"

const HOY = new Date(2026, 8, 8, 13, 30) // 8 de septiembre de 2026

/**
 * El disparador se busca por el nombre de la etiqueta, no por la fecha: al
 * asociar FieldLabel con htmlFor, el `label[for]` gana sobre el contenido y
 * pasa a ser el nombre accesible del botón. Es el mismo patrón que el resto de
 * campos del formulario.
 */
// Nombre exacto: la equis se llama "Quitar la fecha de vencimiento" y un
// regex laxo casaría también con ella.
const trigger = () => screen.getByRole("button", { name: "Fecha de vencimiento" })

function Campo({ due_date, disabled }: { due_date: string | null; disabled?: boolean }) {
  const form = useForm({ defaultValues: { due_date } })
  return (
    <FormProvider {...form}>
      <DueDateField disabled={disabled} />
    </FormProvider>
  )
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(HOY)
})

afterEach(() => {
  vi.useRealTimers()
})

describe("DueDateField", () => {
  it("muestra «Sin fecha» cuando la tarea no tiene ninguna", () => {
    render(<Campo due_date={null} />)
    expect(trigger()).toHaveTextContent("Sin fecha")
  })

  it("escribe la fecha completa cuando la hay", () => {
    render(<Campo due_date="2026-10-20" />)
    expect(trigger()).toHaveTextContent("20 de octubre de 2026")
  })

  it("no desplaza el día por la zona horaria", () => {
    // parseISO interpreta yyyy-MM-dd como fecha local, así que el día 1 se
    // sigue leyendo como día 1 aunque el huso sea negativo.
    render(<Campo due_date="2026-03-01" />)
    expect(trigger()).toHaveTextContent("1 de marzo de 2026")
  })

  it("marca las atrasadas", () => {
    render(<Campo due_date="2026-09-01" />)
    expect(screen.getByText("Atrasada")).toBeInTheDocument()
  })

  it("marca las de hoy", () => {
    render(<Campo due_date="2026-09-08" />)
    expect(screen.getByText("Hoy")).toBeInTheDocument()
  })

  it("no pone distintivo a las fechas que aún quedan lejos", () => {
    render(<Campo due_date="2026-12-01" />)
    expect(screen.queryByText("Atrasada")).not.toBeInTheDocument()
    expect(screen.queryByText("Hoy")).not.toBeInTheDocument()
  })

  it("ofrece quitar la fecha solo cuando hay una", () => {
    const { unmount } = render(<Campo due_date={null} />)
    expect(screen.queryByLabelText(/quitar la fecha/i)).not.toBeInTheDocument()
    unmount()

    render(<Campo due_date="2026-10-20" />)
    expect(screen.getByLabelText(/quitar la fecha/i)).toBeInTheDocument()
  })

  it("vuelve a «Sin fecha» al pulsar la equis", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<Campo due_date="2026-10-20" />)

    await user.click(screen.getByLabelText(/quitar la fecha/i))

    expect(trigger()).toHaveTextContent("Sin fecha")
    expect(screen.queryByLabelText(/quitar la fecha/i)).not.toBeInTheDocument()
  })

  it("deshabilita el disparador y esconde la equis cuando el campo lo está", () => {
    render(<Campo due_date="2026-10-20" disabled />)
    expect(trigger()).toBeDisabled()
    expect(screen.queryByLabelText(/quitar la fecha/i)).not.toBeInTheDocument()
  })
})
