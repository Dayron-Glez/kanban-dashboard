import { describe, expect, it } from "vitest"
import { createMembersRepository } from "../supabase/membersRepository"
import { createFakeSupabase, json, USER_ID } from "./fakeSupabase"

const PROJECT_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7"
const MEMBER_ID = "550e8400-e29b-41d4-a716-446655440000"

const memberRow = (overrides: Record<string, unknown> = {}) => ({
  id: MEMBER_ID,
  project_id: PROJECT_ID,
  user_id: USER_ID,
  role: "owner",
  joined_at: "2026-08-05T20:40:15.964208+00:00",
  profile: {
    id: USER_ID,
    full_name: "Ana Torres",
    email: "ana@cauce.test",
    avatar_url: null,
    updated_at: "2026-08-05T20:40:15.964208+00:00",
  },
  ...overrides,
})

const setup = (...replies: Parameters<typeof createFakeSupabase>) => {
  const { client, requests } = createFakeSupabase(...replies)
  return { repo: createMembersRepository(client), requests }
}

describe("membersRepository.listByProject", () => {
  it("trae los miembros con su perfil en una sola consulta", async () => {
    const { repo, requests } = setup(json([memberRow()]))

    const members = await repo.listByProject(PROJECT_ID)

    expect(requests).toHaveLength(1)
    const { url } = requests[0]!
    expect(url.pathname).toBe("/rest/v1/project_members")
    expect(url.searchParams.get("project_id")).toBe(`eq.${PROJECT_ID}`)
    expect(url.searchParams.get("select")).toBe(
      "id,project_id,user_id,role,joined_at,profile:profiles(*)"
    )
    expect(members).toEqual([
      {
        id: MEMBER_ID,
        projectId: PROJECT_ID,
        userId: USER_ID,
        role: "owner",
        joinedAt: "2026-08-05T20:40:15.964208+00:00",
        profile: { id: USER_ID, fullName: "Ana Torres", email: "ana@cauce.test", avatarUrl: null },
      },
    ])
  })

  it("rechaza un rol que no está en el contrato", async () => {
    const { repo } = setup(json([memberRow({ role: "admin" })]))

    await expect(repo.listByProject(PROJECT_ID)).rejects.toMatchObject({
      code: "invalid_response",
    })
  })
})

describe("membersRepository.remove", () => {
  it("lanza forbidden si la RLS no deja borrar", async () => {
    const { repo } = setup(json([]))

    await expect(repo.remove(MEMBER_ID)).rejects.toMatchObject({ code: "forbidden" })
  })
})
