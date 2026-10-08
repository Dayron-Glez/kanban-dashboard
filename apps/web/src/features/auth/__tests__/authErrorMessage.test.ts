import { describe, expect, it } from "vitest"
import { authErrorMessage } from "../lib/authErrorMessage"

describe("authErrorMessage", () => {
  it("traduce las credenciales incorrectas", () => {
    expect(authErrorMessage({ code: "INVALID_EMAIL_OR_PASSWORD", status: 401 })).toBe(
      "Email o contraseña incorrectos."
    )
  })

  it("distingue la cuenta ya existente", () => {
    expect(authErrorMessage({ code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL", status: 422 })).toBe(
      "Ya existe una cuenta con ese email."
    )
  })

  it("avisa del límite de intentos", () => {
    expect(authErrorMessage({ status: 429 })).toMatch(/Demasiados intentos/)
  })

  it("no confunde un fallo de red con unas credenciales incorrectas", () => {
    expect(authErrorMessage({ status: 0 })).toMatch(/conexión/)
  })

  it("nunca muestra el mensaje en inglés de better-auth", () => {
    expect(authErrorMessage({ code: "SOMETHING_EXOTIC", status: 500 })).toBe(
      "No se ha podido completar. Inténtalo de nuevo."
    )
  })
})
