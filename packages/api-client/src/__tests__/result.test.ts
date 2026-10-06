import type { PostgrestError } from "@supabase/supabase-js"
import { describe, expect, it } from "vitest"
import * as z from "zod"
import { ApiError } from "../errors"
import { parseWith, requireRows, toApiError, unwrap } from "../supabase/result"

const pgError = (code: string, message = "fallo"): PostgrestError =>
  ({ code, message, details: "", hint: "", name: "PostgrestError" }) as PostgrestError

describe("toApiError", () => {
  it.each([
    ["PGRST116", 406, "not_found"],
    ["PGRST301", 401, "unauthorized"],
    ["23505", 409, "conflict"],
    ["42501", 403, "forbidden"],
    ["23514", 400, "invalid_input"],
    ["22P02", 400, "invalid_input"],
    ["XX000", 500, "unknown"],
  ])("traduce %s a %s", (code, status, expected) => {
    expect(toApiError(pgError(code), status).code).toBe(expected)
  })

  it("trata el status 0 como fallo de red, sea cual sea el código", () => {
    const error = toApiError(pgError("", "TypeError: fetch failed"), 0)
    expect(error.code).toBe("network")
  })

  it("trata cualquier 401 como sesión caducada", () => {
    expect(toApiError(pgError("PGRST303"), 401).code).toBe("unauthorized")
  })

  it("conserva el error original como causa", () => {
    const original = pgError("23505")
    expect(toApiError(original, 409).cause).toBe(original)
  })
})

describe("unwrap", () => {
  it("devuelve los datos si no hay error", () => {
    expect(unwrap({ data: [1, 2], error: null, status: 200 })).toEqual([1, 2])
  })

  it("lanza el error traducido", () => {
    expect(() => unwrap({ data: null, error: pgError("42501"), status: 403 })).toThrow(
      expect.objectContaining({ code: "forbidden" })
    )
  })

  it("lanza not_found si la respuesta llega vacía sin error", () => {
    expect(() => unwrap({ data: null, error: null, status: 204 })).toThrow(
      expect.objectContaining({ code: "not_found" })
    )
  })
})

describe("requireRows", () => {
  it("deja pasar las filas afectadas", () => {
    expect(requireRows([{ id: "a" }])).toEqual([{ id: "a" }])
  })

  it("lanza forbidden cuando la RLS deja la operación en 0 filas", () => {
    expect(() => requireRows([])).toThrow(expect.objectContaining({ code: "forbidden" }))
  })
})

describe("parseWith", () => {
  const Schema = z.object({ id: z.string() })

  it("devuelve el valor parseado", () => {
    expect(parseWith(Schema, { id: "a", sobra: 1 })).toEqual({ id: "a" })
  })

  it("lanza invalid_response con un mensaje legible", () => {
    try {
      parseWith(Schema, { id: 42 })
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      expect((error as ApiError).code).toBe("invalid_response")
      expect((error as ApiError).message).toContain("id")
    }
  })
})
