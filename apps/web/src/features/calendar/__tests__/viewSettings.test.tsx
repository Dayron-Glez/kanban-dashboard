import { act, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { MemoryRouter, useLocation } from "react-router"
import { describe, expect, it, vi } from "vitest"
import { usePersistedState } from "../hooks/usePersistedState"
import { useUrlChoice } from "../hooks/useUrlChoice"

describe("los ajustes de la vista", () => {
  it("lo recordado parte de lo guardado y cada cambio se guarda", () => {
    const load = vi.fn(() => ["meeting"])
    const save = vi.fn()
    const { result, rerender } = renderHook(() => usePersistedState(load, save))

    expect(result.current[0]).toEqual(["meeting"])
    act(() => result.current[1](["meeting", "task"]))
    rerender()
    expect(result.current[0]).toEqual(["meeting", "task"])
    expect(save).toHaveBeenCalledWith(["meeting", "task"])
    expect(load).toHaveBeenCalledTimes(1)
  })

  it("lo de la URL se lee con su valor por defecto y se cambia sin perder lo demás", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={["/calendario?vista=gantt"]}>{children}</MemoryRouter>
    )
    const parse = (raw: string | null) => (raw === "semana" || raw === "mes" ? raw : "dia")
    const { result } = renderHook(
      () => ({ zoom: useUrlChoice("zoom", parse), location: useLocation() }),
      { wrapper }
    )

    expect(result.current.zoom[0]).toBe("dia")
    act(() => result.current.zoom[1]("mes"))
    expect(result.current.zoom[0]).toBe("mes")
    expect(result.current.location.search).toBe("?vista=gantt&zoom=mes")
  })
})
