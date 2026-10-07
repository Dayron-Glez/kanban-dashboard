import { act, renderHook, waitFor } from "@testing-library/react"
import { ApiError } from "@repo/api-client"
import type { Invitation, ProjectMember } from "@repo/contracts"
import { beforeEach, describe, expect, it } from "vitest"
import { queryKeys } from "@/shared/api"
import { createFakeApi, createTestQueryClient, createWrapper } from "@/shared/api/testing"
import { useCancelInvitation, useInviteMember } from "../api/invitations"
import { useRemoveMember } from "../api/members"

const PROJECT_ID = "p1"

const member = (id: string): ProjectMember => ({
  id,
  projectId: PROJECT_ID,
  userId: `u-${id}`,
  role: "member",
  joinedAt: "2026-08-05T20:40:15.964208+00:00",
  profile: { id: `u-${id}`, fullName: null, email: null, avatarUrl: null },
})

const invitation = (id: string): Invitation => ({
  id,
  projectId: PROJECT_ID,
  email: `${id}@cauce.test`,
  token: `token-${id}`,
  status: "pending",
  expiresAt: "2026-10-14T10:00:00+00:00",
  createdAt: "2026-10-07T10:00:00+00:00",
})

let api: ReturnType<typeof createFakeApi>
let queryClient: ReturnType<typeof createTestQueryClient>
let wrapper: ReturnType<typeof createWrapper>

beforeEach(() => {
  api = createFakeApi()
  queryClient = createTestQueryClient()
  wrapper = createWrapper(api, queryClient)
})

describe("useRemoveMember", () => {
  const key = queryKeys.projects.members(PROJECT_ID)
  const ids = () => queryClient.getQueryData<ProjectMember[]>(key)?.map((m) => m.id)

  beforeEach(() => {
    queryClient.setQueryData(key, [member("m1"), member("m2")])
  })

  it("devuelve al miembro a la lista si el servidor no deja quitarlo", async () => {
    api.members.remove.mockRejectedValue(new ApiError("forbidden", "0 filas"))
    const { result } = renderHook(() => useRemoveMember(PROJECT_ID), { wrapper })

    await act(() => result.current.mutateAsync("m1").catch(() => {}))

    expect(ids()).toEqual(expect.arrayContaining(["m1", "m2"]))
  })

  it("al deshacer un borrado no resucita otro que sí terminó bien", async () => {
    let rejectFirst!: (error: unknown) => void
    api.members.remove
      .mockReturnValueOnce(new Promise((_resolve, reject) => (rejectFirst = reject)))
      .mockResolvedValueOnce()
    api.members.listByProject.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useRemoveMember(PROJECT_ID), { wrapper })

    act(() => result.current.mutate("m1"))
    await waitFor(() => expect(ids()).toEqual(["m2"]))
    await act(() => result.current.mutateAsync("m2"))
    await act(async () => rejectFirst(new ApiError("network", "fetch failed")))

    await waitFor(() => expect(ids()).toEqual(["m1"]))
  })
})

describe("invitaciones", () => {
  const key = queryKeys.projects.invitations(PROJECT_ID)
  const ids = () => queryClient.getQueryData<Invitation[]>(key)?.map((i) => i.id)

  beforeEach(() => {
    queryClient.setQueryData(key, [invitation("i1")])
  })

  it("useInviteMember añade la invitación creada al principio", async () => {
    api.invitations.create.mockResolvedValue(invitation("i2"))
    const { result } = renderHook(() => useInviteMember(PROJECT_ID), { wrapper })

    await act(() => result.current.mutateAsync("i2@cauce.test"))

    expect(api.invitations.create).toHaveBeenCalledWith({
      projectId: PROJECT_ID,
      email: "i2@cauce.test",
    })
    expect(ids()).toEqual(["i2", "i1"])
  })

  it("useCancelInvitation la devuelve si el servidor falla", async () => {
    api.invitations.cancel.mockRejectedValue(new ApiError("forbidden", "0 filas"))
    const { result } = renderHook(() => useCancelInvitation(PROJECT_ID), { wrapper })

    await act(() => result.current.mutateAsync("i1").catch(() => {}))

    expect(ids()).toEqual(["i1"])
  })
})
