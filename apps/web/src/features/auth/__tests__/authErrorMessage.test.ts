import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js"
import { describe, expect, it } from "vitest"
import { authErrorMessage } from "../lib/authErrorMessage"

describe("authErrorMessage", () => {
  it("traduce las credenciales incorrectas", () => {
    const error = new AuthApiError("Invalid login credentials", 400, "invalid_credentials")
    expect(authErrorMessage(error)).toBe("Email o contraseña incorrectos.")
  })

  it("distingue la cuenta ya existente", () => {
    const error = new AuthApiError("User already registered", 422, "user_already_exists")
    expect(authErrorMessage(error)).toBe("Ya existe una cuenta con ese email.")
  })

  it("no confunde un fallo de red con unas credenciales incorrectas", () => {
    const error = new AuthRetryableFetchError("Failed to fetch", 0)
    expect(authErrorMessage(error)).toMatch(/conexión/)
  })

  it("nunca muestra el mensaje en inglés de Supabase", () => {
    const error = new AuthApiError("Something exotic happened", 500, "unexpected_failure")
    expect(authErrorMessage(error)).toBe("No se ha podido completar. Inténtalo de nuevo.")
  })
})
