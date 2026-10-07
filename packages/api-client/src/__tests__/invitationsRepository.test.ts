import { describe, expect, it } from "vitest"
import { createInvitationsRepository } from "../supabase/invitationsRepository"
import { createFakeSupabase, json } from "./fakeSupabase"

const PROJECT_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7"
const INVITATION_ID = "550e8400-e29b-41d4-a716-446655440000"
const TOKEN = "9b2f4c1e-3d5a-4b6c-8d7e-0f1a2b3c4d5e"

const invitationRow = (overrides: Record<string, unknown> = {}) => ({
  id: INVITATION_ID,
  project_id: PROJECT_ID,
  email: "luis@cauce.test",
  token: TOKEN,
  status: "pending",
  expires_at: "2026-10-14T10:00:00+00:00",
  created_at: "2026-10-07T10:00:00+00:00",
  ...overrides,
})

const setup = (...replies: Parameters<typeof createFakeSupabase>) => {
  const { client, requests } = createFakeSupabase(...replies)
  return { repo: createInvitationsRepository(client), requests }
}

describe("invitationsRepository", () => {
  it("listPending filtra por proyecto y estado pendiente", async () => {
    const { repo, requests } = setup(json([invitationRow()]))

    const invitations = await repo.listPending(PROJECT_ID)

    const { url } = requests[0]!
    expect(url.searchParams.get("project_id")).toBe(`eq.${PROJECT_ID}`)
    expect(url.searchParams.get("status")).toBe("eq.pending")
    expect(invitations[0]).toMatchObject({ token: TOKEN, expiresAt: "2026-10-14T10:00:00+00:00" })
  })

  it("create deja token y caducidad a la base", async () => {
    const { repo, requests } = setup(json(invitationRow(), 201))

    await repo.create({ projectId: PROJECT_ID, email: "luis@cauce.test" })

    expect(requests[0]).toMatchObject({
      method: "POST",
      body: { project_id: PROJECT_ID, email: "luis@cauce.test" },
    })
  })

  it("cancel lanza forbidden si la RLS no deja borrar", async () => {
    const { repo } = setup(json([]))

    await expect(repo.cancel(INVITATION_ID)).rejects.toMatchObject({ code: "forbidden" })
  })

  it("findByToken llama a la RPC y mapea el resultado", async () => {
    const { repo, requests } = setup(
      json([
        {
          id: INVITATION_ID,
          project_id: PROJECT_ID,
          project_name: "Largometraje",
          email: "luis@cauce.test",
          status: "pending",
          expires_at: "2026-10-14T10:00:00+00:00",
        },
      ])
    )

    const preview = await repo.findByToken(TOKEN)

    expect(requests[0]).toMatchObject({ method: "POST", body: { p_token: TOKEN } })
    expect(requests[0]!.url.pathname).toBe("/rest/v1/rpc/invitation_by_token")
    expect(preview).toMatchObject({ projectName: "Largometraje", status: "pending" })
  })

  it("findByToken devuelve null si el token no existe", async () => {
    const { repo } = setup(json([]))

    await expect(repo.findByToken(TOKEN)).resolves.toBeNull()
  })

  it("accept devuelve el proyecto al que da acceso", async () => {
    const { repo } = setup(json(PROJECT_ID))

    await expect(repo.accept(TOKEN)).resolves.toBe(PROJECT_ID)
  })

  it("accept traduce el rechazo de la base por email ajeno", async () => {
    const { repo } = setup(
      json({ code: "42501", message: "La invitación está dirigida a otra dirección" }, 403)
    )

    await expect(repo.accept(TOKEN)).rejects.toMatchObject({ code: "forbidden" })
  })
})
