import { randomUUID } from "node:crypto"
import type { Invitation, Project, ProjectMember, ProjectSummary } from "@repo/contracts"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createTestApp, type TestUser } from "../testing/test-app.js"

// Ana crea el proyecto, invita a Marta y Luis no tiene nada que ver. Los tests
// van en orden y comparten estado: cada uno parte de lo que dejó el anterior.
let ctx: Awaited<ReturnType<typeof createTestApp>>
let ana: TestUser
let marta: TestUser
let luis: TestUser
let project: Project
let invitation: Invitation

const as = (user: TestUser) => ctx.as(user)

beforeAll(async () => {
  ctx = await createTestApp()
  ana = await ctx.createUser("ana")
  marta = await ctx.createUser("marta")
  luis = await ctx.createUser("luis")
})

afterAll(async () => {
  await ctx?.close()
})

describe("proyectos", () => {
  it("crea el proyecto con sus columnas y a quien lo crea como propietario", async () => {
    const response = await as(ana).post("/projects", {
      name: "  Largometraje  ",
      description: "",
      color: "#ef4444",
    })

    expect(response.status).toBe(201)
    project = response.body as Project
    expect(project).toMatchObject({ ownerId: ana.id, name: "Largometraje", description: null })

    const columns = await ctx.sql`
      select title, category from columns where project_id = ${project.id} order by position`
    expect(columns.map((column) => column.title)).toEqual([
      "Pendiente",
      "Listo",
      "En curso",
      "En revisión",
      "Hecho",
    ])

    const mine = (await as(ana).get("/projects")).body as ProjectSummary[]
    expect(mine).toEqual([{ ...project, role: "owner", isFavorite: false, taskCount: 0 }])
  })

  it("rechaza un nombre vacío", async () => {
    const response = await as(ana).post("/projects", { name: "   ", color: "#ef4444" })

    expect(response.status).toBe(400)
  })

  it("rechaza un id que no es un UUID", async () => {
    const response = await as(ana).get("/projects/no-es-un-uuid/members")

    expect(response.status).toBe(400)
  })
})

describe("alguien ajeno al proyecto", () => {
  it("no lo ve en su lista", async () => {
    const response = await as(luis).get("/projects")

    expect(response.status).toBe(200)
    expect(response.body).toEqual([])
  })

  it("recibe 404 en todo lo que toque el proyecto, sin saber si existe", async () => {
    const path = `/projects/${project.id}`
    const responses = await Promise.all([
      as(luis).get(`${path}/members`),
      as(luis).get(`${path}/invitations`),
      as(luis).post(`${path}/invitations`, { email: luis.email }),
      as(luis).patch(path, { name: "Mío" }),
      as(luis).put(`${path}/favorite`, { isFavorite: true }),
      as(luis).delete(path),
    ])

    expect(responses.map((response) => response.status)).toEqual([404, 404, 404, 404, 404, 404])
    const [row] = await ctx.sql`select name from core.projects where id = ${project.id}`
    expect(row?.name).toBe("Largometraje")
  })

  it("no puede quitar miembros", async () => {
    const [owner] = await ctx.sql`
      select id from core.project_members where project_id = ${project.id} and user_id = ${ana.id}`

    const response = await as(luis).delete(`/members/${owner!.id}`)

    expect(response.status).toBe(404)
  })
})

describe("invitaciones", () => {
  it("la propietaria invita", async () => {
    const response = await as(ana).post(`/projects/${project.id}/invitations`, {
      email: marta.email,
    })

    expect(response.status).toBe(201)
    invitation = response.body as Invitation
    expect(invitation).toMatchObject({
      projectId: project.id,
      email: marta.email,
      status: "pending",
    })
  })

  it("rechaza un correo que no es un correo", async () => {
    const response = await as(ana).post(`/projects/${project.id}/invitations`, {
      email: "marta",
    })

    expect(response.status).toBe(400)
  })

  it("quien tiene el enlace ve la invitación, sin el token", async () => {
    const response = await as(marta).get(`/invitations/token/${invitation.token}`)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      id: invitation.id,
      projectId: project.id,
      projectName: "Largometraje",
      email: marta.email,
      status: "pending",
      expiresAt: invitation.expiresAt,
    })
  })

  it("un token que no existe da 404", async () => {
    const response = await as(marta).get(`/invitations/token/${randomUUID()}`)

    expect(response.status).toBe(404)
  })

  it("no la acepta alguien con otro correo", async () => {
    const response = await as(luis).post(`/invitations/token/${invitation.token}/accept`)

    expect(response.status).toBe(403)
  })

  it("la acepta la invitada, y volver a abrir el enlace la lleva al proyecto", async () => {
    const first = await as(marta).post(`/invitations/token/${invitation.token}/accept`)
    const again = await as(marta).post(`/invitations/token/${invitation.token}/accept`)

    expect(first.status).toBe(200)
    expect(first.body).toEqual({ projectId: project.id })
    expect(again.body).toEqual({ projectId: project.id })

    const pending = await as(ana).get(`/projects/${project.id}/invitations`)
    expect(pending.body).toEqual([])
  })

  it("una invitación caducada no se puede aceptar", async () => {
    const created = await as(ana).post(`/projects/${project.id}/invitations`, {
      email: luis.email,
    })
    const expired = created.body as Invitation
    await ctx.sql`
      update core.project_invitations set expires_at = now() - interval '1 minute'
      where id = ${expired.id}`

    const response = await as(luis).post(`/invitations/token/${expired.token}/accept`)

    expect(response.status).toBe(404)
    expect((await as(luis).get(`/projects/${project.id}/members`)).status).toBe(404)
    expect((await as(ana).delete(`/invitations/${expired.id}`)).status).toBe(204)
  })
})

describe("una miembro que no es propietaria", () => {
  it("ve el proyecto y a sus miembros", async () => {
    const mine = (await as(marta).get("/projects")).body as ProjectSummary[]
    const members = (await as(marta).get(`/projects/${project.id}/members`)).body as ProjectMember[]

    expect(mine).toEqual([{ ...project, role: "member", isFavorite: false, taskCount: 0 }])
    expect(members.map((member) => [member.profile.email, member.role])).toEqual([
      [ana.email, "owner"],
      [marta.email, "member"],
    ])
  })

  it("no puede renombrar, borrar ni invitar", async () => {
    const path = `/projects/${project.id}`
    const responses = await Promise.all([
      as(marta).patch(path, { name: "Mío" }),
      as(marta).delete(path),
      as(marta).post(`${path}/invitations`, { email: luis.email }),
    ])

    expect(responses.map((response) => response.status)).toEqual([403, 403, 403])
  })

  it("no puede quitar a nadie", async () => {
    const members = (await as(marta).get(`/projects/${project.id}/members`)).body as ProjectMember[]

    const response = await as(marta).delete(`/members/${members[0]!.id}`)

    expect(response.status).toBe(403)
  })

  it("marca el favorito solo para ella", async () => {
    const response = await as(marta).put(`/projects/${project.id}/favorite`, { isFavorite: true })

    expect(response.status).toBe(204)
    const [forMarta] = (await as(marta).get("/projects")).body as ProjectSummary[]
    const [forAna] = (await as(ana).get("/projects")).body as ProjectSummary[]
    expect(forMarta?.isFavorite).toBe(true)
    expect(forAna?.isFavorite).toBe(false)
  })
})

describe("la propietaria", () => {
  it("renombra el proyecto", async () => {
    const response = await as(ana).patch(`/projects/${project.id}`, { name: "Cortometraje" })

    expect(response.status).toBe(204)
    const [mine] = (await as(ana).get("/projects")).body as ProjectSummary[]
    expect(mine?.name).toBe("Cortometraje")
  })

  it("no puede quitarse a sí misma y dejar el proyecto sin propietario", async () => {
    const members = (await as(ana).get(`/projects/${project.id}/members`)).body as ProjectMember[]
    const owner = members.find((member) => member.role === "owner")!

    const response = await as(ana).delete(`/members/${owner.id}`)

    expect(response.status).toBe(403)
  })

  it("quita a una miembro, que deja de verlo", async () => {
    const members = (await as(ana).get(`/projects/${project.id}/members`)).body as ProjectMember[]
    const member = members.find((m) => m.userId === marta.id)!

    const response = await as(ana).delete(`/members/${member.id}`)

    expect(response.status).toBe(204)
    expect((await as(marta).get("/projects")).body).toEqual([])
    expect((await as(marta).get(`/projects/${project.id}/members`)).status).toBe(404)
  })

  it("borra el proyecto", async () => {
    const response = await as(ana).delete(`/projects/${project.id}`)

    expect(response.status).toBe(204)
    expect((await as(ana).get("/projects")).body).toEqual([])
  })
})

describe("rutas", () => {
  it("sin sesión no deja entrar", async () => {
    const response = await request(ctx.app.getHttpServer()).get("/api/projects")

    expect(response.status).toBe(401)
  })

  it("/health queda fuera del prefijo, que es la ruta que comprueba Railway", async () => {
    const server = ctx.app.getHttpServer()

    expect((await request(server).get("/health")).status).toBe(200)
    expect((await request(server).get("/api/health")).status).toBe(404)
  })
})
