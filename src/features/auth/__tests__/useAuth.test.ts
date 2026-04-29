import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useAuth } from "../context/AuthContext"

describe("useAuth", () => {
  it("lanza error si se usa fuera de AuthProvider", () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      "useAuth debe usarse dentro de AuthProvider"
    )
  })
})
