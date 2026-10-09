import { randomUUID } from "node:crypto"
import bcrypt from "bcryptjs"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createTestApp } from "../testing/test-app.js"

// El login de verdad: better-auth contra la base local, con cookie.
let ctx: Awaited<ReturnType<typeof createTestApp>>

// better-auth comprueba el origen de las peticiones que llevan cookie: el de
// la web, como haría el navegador.
const ORIGIN = "http://localhost:5173"

const post = (path: string, body: object, cookie = "") =>
  request(ctx.app.getHttpServer())
    .post(`/api/auth${path}`)
    .set("Origin", ORIGIN)
    .set("Cookie", cookie)
    .send(body)

const me = (cookie: string) => request(ctx.app.getHttpServer()).get("/api/me").set("Cookie", cookie)

// Lo que mandaría el navegador de vuelta: nombre=valor de cada Set-Cookie.
const cookieOf = (response: request.Response): string => {
  const header = response.headers["set-cookie"] as unknown as string[] | undefined
  return (header ?? []).map((cookie) => cookie.split(";")[0]).join("; ")
}

const email = (name: string) => `${name}-${randomUUID().slice(0, 8)}@int.test`

beforeAll(async () => {
  ctx = await createTestApp({ fakeSessions: false })
})

afterAll(async () => {
  await ctx?.close()
})

describe("registro", () => {
  it("crea la cuenta, su perfil y una sesión con la que la API la reconoce", async () => {
    const address = email("ana")

    const response = await post("/sign-up/email", {
      name: "Ana",
      email: address,
      password: "rodaje-2027",
    })

    expect(response.status).toBe(200)
    const session = await me(cookieOf(response))
    expect(session.status).toBe(200)
    expect(session.body).toMatchObject({ email: address })

    const [profile] = await ctx.sql`
      select full_name, email from public.profiles where id = ${session.body.id as string}`
    expect(profile).toEqual({ full_name: "Ana", email: address })
  })

  it("exige al menos 8 caracteres en la contraseña", async () => {
    const response = await post("/sign-up/email", {
      name: "Corta",
      email: email("corta"),
      password: "1234567",
    })

    expect(response.status).toBe(400)
  })

  it("no deja registrar dos veces el mismo correo", async () => {
    const address = email("doble")
    await post("/sign-up/email", { name: "Uno", email: address, password: "rodaje-2027" })

    const response = await post("/sign-up/email", {
      name: "Dos",
      email: address,
      password: "rodaje-2027",
    })

    expect(response.status).toBe(422)
  })
})

describe("usuarios importados de Supabase", () => {
  // Como los deja la migración: contraseña en bcrypt y account 'credential'.
  // Una de 6 caracteres, el mínimo de Supabase, para comprobar que puede entrar.
  const address = email("importada")
  const PASSWORD = "seis66"

  beforeAll(async () => {
    const id = randomUUID()
    await ctx.sql`
      insert into identity.users (id, name, email, email_verified)
      values (${id}, 'Importada', ${address}, true)`
    await ctx.sql`
      insert into identity.accounts (user_id, account_id, provider_id, password)
      values (${id}, ${id}, 'credential', ${await bcrypt.hash(PASSWORD, 10)})`
  })

  it("entra con su contraseña de siempre", async () => {
    const response = await post("/sign-in/email", { email: address, password: PASSWORD })

    expect(response.status).toBe(200)
    expect((await me(cookieOf(response))).body).toMatchObject({ email: address })
  })

  it("el correo no distingue mayúsculas", async () => {
    const response = await post("/sign-in/email", {
      email: address.toUpperCase(),
      password: PASSWORD,
    })

    expect(response.status).toBe(200)
  })

  it("con otra contraseña no entra", async () => {
    const response = await post("/sign-in/email", { email: address, password: "otra-cosa" })

    expect(response.status).toBe(401)
  })
})

describe("sesión", () => {
  it("sin cookie, la API responde 401", async () => {
    expect((await me("")).status).toBe(401)
  })

  it("una cookie inventada no vale", async () => {
    expect((await me("better-auth.session_token=inventada")).status).toBe(401)
  })

  it("al salir, la cookie deja de valer", async () => {
    const signedUp = await post("/sign-up/email", {
      name: "Luis",
      email: email("luis"),
      password: "rodaje-2027",
    })
    const cookie = cookieOf(signedUp)
    expect((await me(cookie)).status).toBe(200)

    const signedOut = await post("/sign-out", {}, cookie)

    expect(signedOut.status).toBe(200)
    expect((await me(cookie)).status).toBe(401)
  })

  it("guarda la IP del usuario aunque llegue tras varios proxys", async () => {
    const response = await request(ctx.app.getHttpServer())
      .post("/api/auth/sign-up/email")
      .set("Origin", ORIGIN)
      .set("X-Forwarded-For", "203.0.113.7, 76.76.21.9, 10.0.0.1")
      .send({ name: "Proxy", email: email("proxy"), password: "rodaje-2027" })

    expect(response.status).toBe(200)
    const session = await me(cookieOf(response))
    const [row] = await ctx.sql`
      select ip_address from identity.sessions where user_id = ${session.body.id as string}`
    expect(row?.ip_address).toBe("203.0.113.7")
  })

  it("con la cookie se usa el resto de la API", async () => {
    const signedUp = await post("/sign-up/email", {
      name: "Marta",
      email: email("marta"),
      password: "rodaje-2027",
    })

    const response = await request(ctx.app.getHttpServer())
      .get("/api/projects")
      .set("Cookie", cookieOf(signedUp))

    expect(response.status).toBe(200)
    expect(response.body).toEqual([])
  })
})
