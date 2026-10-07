import { describe, expect, it, vi } from "vitest"
import * as z from "zod"
import { createHttpClient } from "../http/httpClient"

const BASE_URL = "https://api.cauce.test"

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })

const setup = (reply: Response | Error, token: string | null = "token-de-sesion") => {
  const fetch = vi.fn<typeof globalThis.fetch>(() =>
    reply instanceof Error ? Promise.reject(reply) : Promise.resolve(reply)
  )
  const client = createHttpClient({
    baseUrl: BASE_URL,
    getAccessToken: () => Promise.resolve(token),
    fetch,
  })
  const call = () => {
    const [url, init] = fetch.mock.calls[0]!
    return { url: String(url), init: init!, headers: init!.headers as Record<string, string> }
  }
  return { client, call }
}

const Me = z.object({ id: z.string(), email: z.string().nullable() })

describe("createHttpClient", () => {
  it("manda el token de sesión y devuelve la respuesta validada", async () => {
    const { client, call } = setup(json({ id: "u1", email: "ana@cauce.test", sobra: true }))

    const me = await client.request("GET", "/me", { schema: Me })

    expect(me).toEqual({ id: "u1", email: "ana@cauce.test" })
    expect(call().url).toBe(`${BASE_URL}/me`)
    expect(call().headers.Authorization).toBe("Bearer token-de-sesion")
  })

  it("respeta la ruta de la base, como la API servida bajo /api", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(() =>
      Promise.resolve(json({ id: "u1", email: null }))
    )
    const client = createHttpClient({
      baseUrl: "https://cauce.app/api/",
      getAccessToken: () => Promise.resolve(null),
      fetch,
    })

    await client.request("GET", "/me", { schema: Me })

    expect(String(fetch.mock.calls[0]![0])).toBe("https://cauce.app/api/me")
  })

  it("sin sesión no manda la cabecera Authorization", async () => {
    const { client, call } = setup(json({ id: "u1", email: null }), null)

    await client.request("GET", "/me", { schema: Me })

    expect(call().headers.Authorization).toBeUndefined()
  })

  it("envía el cuerpo como JSON", async () => {
    const { client, call } = setup(new Response(null, { status: 204 }))

    await client.request("PATCH", "/projects/p1", { body: { name: "Largometraje" } })

    expect(call().init.method).toBe("PATCH")
    expect(call().init.body).toBe('{"name":"Largometraje"}')
    expect(call().headers["Content-Type"]).toBe("application/json")
  })

  it.each([
    [400, "invalid_input"],
    [401, "unauthorized"],
    [403, "forbidden"],
    [404, "not_found"],
    [409, "conflict"],
    [422, "invalid_input"],
    [500, "unknown"],
  ])("traduce el estado %i a %s", async (status, code) => {
    const { client } = setup(json({ message: "fallo", statusCode: status }, status))

    await expect(client.request("GET", "/me", { schema: Me })).rejects.toMatchObject({ code })
  })

  it("conserva el mensaje de la API, también cuando es una lista", async () => {
    const { client } = setup(
      json({ message: ["El nombre es obligatorio", "El color no es válido"] }, 400)
    )

    await expect(client.request("POST", "/projects", { body: {} })).rejects.toMatchObject({
      message: "El nombre es obligatorio. El color no es válido",
    })
  })

  it("trata un fallo de conexión como error de red", async () => {
    const { client } = setup(new TypeError("Failed to fetch"))

    await expect(client.request("GET", "/me", { schema: Me })).rejects.toMatchObject({
      code: "network",
    })
  })

  it("rechaza una respuesta que no cumple el contrato", async () => {
    const { client } = setup(json({ id: 42 }))

    await expect(client.request("GET", "/me", { schema: Me })).rejects.toMatchObject({
      code: "invalid_response",
    })
  })
})
