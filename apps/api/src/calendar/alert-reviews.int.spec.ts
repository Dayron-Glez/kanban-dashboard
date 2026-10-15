import type { Alert, AlertConflictReview, CalendarPlan, Project } from "@repo/contracts"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createTestApp, type TestUser } from "../testing/test-app.js"

// Ana es la propietaria, Marta miembro y Luis ajeno. Los tests van en orden.
let ctx: Awaited<ReturnType<typeof createTestApp>>
let ana: TestUser
let marta: TestUser
let luis: TestUser
let project: Project
let alert: Alert
let actionId: string
let foreignActionId: string

const as = (user: TestUser) => ctx.as(user)
const reviewUrl = () => `/alerts/${alert.id}/reviews/${actionId}`
const reviewsOf = async (user = ana) =>
  (await as(user).get(`/projects/${project.id}/alert-reviews`)).body as AlertConflictReview[]

const firstTask = async (projectId: string) =>
  ((await as(ana).get(`/projects/${projectId}/plan`)).body as CalendarPlan).elements.find(
    (element) => element.kind === "task"
  )!.id

const createStrike = async () =>
  (
    await as(ana).post(`/projects/${project.id}/alerts`, {
      title: "Huelga general",
      cause: "strike",
      scope: "project",
      when: { startsOn: "2026-10-16", endsOn: null },
    })
  ).body as Alert

beforeAll(async () => {
  ctx = await createTestApp()
  ana = await ctx.createUser("ana")
  marta = await ctx.createUser("marta")
  luis = await ctx.createUser("luis")

  project = (await as(ana).post("/projects", { name: "Película", color: "#ef4444" }))
    .body as Project
  const other = (await as(ana).post("/projects", { name: "Otra", color: "#ef4444" }))
    .body as Project
  const { body: invitation } = await as(ana).post(`/projects/${project.id}/invitations`, {
    email: marta.email,
  })
  await as(marta).post(`/invitations/token/${(invitation as { token: string }).token}/accept`)

  alert = await createStrike()
  actionId = await firstTask(project.id)
  foreignActionId = await firstTask(other.id)
})

afterAll(async () => {
  await ctx?.close()
})

describe("lo asumo", () => {
  it("la propietaria marca un conflicto como revisado, y los miembros lo ven", async () => {
    expect((await as(ana).put(reviewUrl(), {})).status).toBe(204)

    const reviews = await reviewsOf(marta)
    expect(reviews).toEqual([
      {
        alertId: alert.id,
        elementId: actionId,
        reviewedBy: ana.id,
        reviewedAt: expect.any(String),
      },
    ])
  })

  it("marcarlo otra vez no lo duplica ni cambia cuándo se asumió", async () => {
    const [before] = await reviewsOf()
    expect((await as(ana).put(reviewUrl(), {})).status).toBe(204)
    expect(await reviewsOf()).toEqual([before])
  })

  it("se desmarca", async () => {
    expect((await as(ana).delete(reviewUrl())).status).toBe(204)
    expect(await reviewsOf()).toEqual([])
  })

  it("la alerta y el elemento son del mismo proyecto, y la alerta existe", async () => {
    expect((await as(ana).put(`/alerts/${alert.id}/reviews/${foreignActionId}`, {})).status).toBe(
      400
    )
    expect(
      (await as(ana).put(`/alerts/${crypto.randomUUID()}/reviews/${actionId}`, {})).status
    ).toBe(404)
  })

  it("solo la propietaria lo marca, y quien no es miembro no ve nada", async () => {
    expect((await as(marta).put(reviewUrl(), {})).status).toBe(403)
    expect((await as(marta).delete(reviewUrl())).status).toBe(403)
    expect((await as(luis).put(reviewUrl(), {})).status).toBe(404)
    expect((await as(luis).get(`/projects/${project.id}/alert-reviews`)).status).toBe(404)
  })

  it("se borra con la alerta y con el elemento", async () => {
    await as(ana).put(reviewUrl(), {})
    await as(ana).delete(`/alerts/${alert.id}`)
    expect(await reviewsOf()).toEqual([])

    alert = await createStrike()
    await as(ana).put(reviewUrl(), {})
    await as(ana).delete(`/elements/${actionId}`)
    expect(await reviewsOf()).toEqual([])
  })
})
