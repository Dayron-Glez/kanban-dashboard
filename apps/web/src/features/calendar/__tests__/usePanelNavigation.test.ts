import { act, renderHook } from "@testing-library/react"
import { fireEvent } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { usePanelNavigation } from "../hooks/usePanelNavigation"

const order = ["rodaje", "shooting", "wrap"]
const setup = () => renderHook(() => usePanelNavigation(order))

describe("el panel de la derecha", () => {
  it("uno cada vez: abrir un día cierra el elemento, y una acción nueva, el día", () => {
    const { result } = setup()
    act(() => result.current.openElement("shooting"))
    expect(result.current.openId).toBe("shooting")
    act(() => result.current.openDayPanel(10, "rodaje"))
    expect(result.current).toMatchObject({ openId: null, openDay: { day: 10, rowId: "rodaje" } })
    act(() =>
      result.current.openNewAction({
        parentId: "rodaje",
        kind: "task",
        startsOn: "2027-04-14",
        endsOn: null,
      })
    )
    expect(result.current.openDay).toBeNull()
    expect(result.current.newValues).toMatchObject({ kind: "task", parentId: "rodaje" })
  })

  it("con cambios, salir pregunta; descartar va adonde se iba y quita el borrador", () => {
    const { result } = setup()
    act(() => result.current.openElement("shooting"))
    act(() => result.current.onPanelDraft({ name: "Rodaje 1" }))
    expect(result.current.dirty).toBe(true)

    act(() => result.current.openElement("wrap"))
    expect(result.current.leaving).toEqual({ target: { element: "wrap" } })
    expect(result.current.openId).toBe("shooting")

    act(() => result.current.discard())
    expect(result.current).toMatchObject({ openId: "wrap", leaving: null, dirty: false })
  })

  it("↑ ↓ pasan al elemento de al lado y Esc cierra, también sin cambios", () => {
    const { result } = setup()
    act(() => result.current.openElement("shooting"))
    act(() => {
      fireEvent.keyDown(document.body, { key: "ArrowDown" })
    })
    expect(result.current.openId).toBe("wrap")
    act(() => {
      fireEvent.keyDown(document.body, { key: "Escape" })
    })
    expect(result.current.openId).toBeNull()
  })

  it("lo que se escribe en un campo no mueve el panel", () => {
    const { result } = setup()
    act(() => result.current.openElement("shooting"))
    const input = document.createElement("input")
    document.body.append(input)
    act(() => {
      fireEvent.keyDown(input, { key: "ArrowUp" })
    })
    expect(result.current.openId).toBe("shooting")
    input.remove()
  })
})
