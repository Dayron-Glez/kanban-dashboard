import { act, renderHook, waitFor } from "@testing-library/react"
import { ApiError } from "@repo/api-client"
import type { ProjectSummary } from "@repo/contracts"
import { beforeEach, describe, expect, it } from "vitest"
import { queryKeys } from "@/shared/api"
import { createFakeApi, createTestQueryClient, createWrapper } from "@/shared/api/testing"
import { useDeleteProject, useRenameProject, useToggleFavorite } from "../api/projectMutations"
import { useProject, useProjects } from "../api/projectQueries"

const summary = (overrides: Partial<ProjectSummary> = {}): ProjectSummary => ({
  id: "p1",
  ownerId: "u1",
  kind: "film",
  name: "Largometraje",
  description: null,
  color: "#6366f1",
  createdAt: "2026-08-05T20:40:15.964208+00:00",
  role: "owner",
  isFavorite: false,
  taskCount: 3,
  ...overrides,
})

const deferred = () => {
  let resolve!: () => void
  let reject!: (error: unknown) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

let api: ReturnType<typeof createFakeApi>
let queryClient: ReturnType<typeof createTestQueryClient>
let wrapper: ReturnType<typeof createWrapper>

const cached = () => queryClient.getQueryData<ProjectSummary[]>(queryKeys.projects.mine())

beforeEach(() => {
  api = createFakeApi()
  queryClient = createTestQueryClient()
  wrapper = createWrapper(api, queryClient)
})

describe("useProjects", () => {
  it("carga los proyectos del usuario", async () => {
    api.projects.listMine.mockResolvedValue([summary()])

    const { result } = renderHook(() => useProjects(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([summary()])
  })

  it("expone el error si la carga falla", async () => {
    api.projects.listMine.mockRejectedValue(new ApiError("network", "fetch failed"))

    const { result } = renderHook(() => useProjects(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({ code: "network" })
  })

  it("useProject selecciona uno de la misma consulta", async () => {
    api.projects.listMine.mockResolvedValue([summary(), summary({ id: "p2", name: "Corto" })])

    const { result } = renderHook(() => useProject("p2"), { wrapper })

    await waitFor(() => expect(result.current.data?.name).toBe("Corto"))
    expect(api.projects.listMine).toHaveBeenCalledTimes(1)
  })
})

describe("useToggleFavorite", () => {
  beforeEach(() => {
    queryClient.setQueryData(queryKeys.projects.mine(), [summary()])
    api.projects.listMine.mockResolvedValue([summary({ isFavorite: true })])
  })

  it("marca el favorito antes de que responda el servidor", async () => {
    const request = deferred()
    api.projects.setFavorite.mockReturnValue(request.promise)
    const { result } = renderHook(() => useToggleFavorite(), { wrapper })

    act(() => result.current.mutate({ projectId: "p1", isFavorite: true }))

    await waitFor(() => expect(cached()?.[0]?.isFavorite).toBe(true))
    expect(api.projects.setFavorite).toHaveBeenCalledWith("p1", true)
    request.resolve()
  })

  it("lo deshace si el servidor falla", async () => {
    api.projects.setFavorite.mockRejectedValue(new ApiError("forbidden", "0 filas"))
    const { result } = renderHook(() => useToggleFavorite(), { wrapper })

    await act(() =>
      result.current.mutateAsync({ projectId: "p1", isFavorite: true }).catch(() => {})
    )

    expect(cached()?.[0]?.isFavorite).toBe(false)
  })
})

describe("useRenameProject", () => {
  beforeEach(() => {
    queryClient.setQueryData(queryKeys.projects.mine(), [summary(), summary({ id: "p2" })])
  })

  it("al fallar deshace solo su cambio y respeta otra mutación que terminó bien", async () => {
    const rename = deferred()
    api.projects.rename.mockReturnValue(rename.promise)
    api.projects.setFavorite.mockResolvedValue()
    api.projects.listMine.mockReturnValue(new Promise(() => {}))
    const { result: renameHook } = renderHook(() => useRenameProject(), { wrapper })
    const { result: favoriteHook } = renderHook(() => useToggleFavorite(), { wrapper })

    act(() => renameHook.current.mutate({ id: "p1", name: "Nuevo título" }))
    await waitFor(() => expect(cached()?.[0]?.name).toBe("Nuevo título"))

    await act(() => favoriteHook.current.mutateAsync({ projectId: "p2", isFavorite: true }))
    await act(async () => rename.reject(new ApiError("forbidden", "0 filas")))

    await waitFor(() => expect(cached()?.[0]?.name).toBe("Largometraje"))
    expect(cached()?.[1]?.isFavorite).toBe(true)
  })

  it("no recarga la lista mientras quede otra mutación en vuelo", async () => {
    const favorite = deferred()
    api.projects.setFavorite.mockReturnValue(favorite.promise)
    api.projects.rename.mockResolvedValue()
    const { result: renameHook } = renderHook(() => useRenameProject(), { wrapper })
    const { result: favoriteHook } = renderHook(() => useToggleFavorite(), { wrapper })

    const invalidated = () => queryClient.getQueryState(queryKeys.projects.mine())?.isInvalidated

    act(() => favoriteHook.current.mutate({ projectId: "p2", isFavorite: true }))
    await act(() => renameHook.current.mutateAsync({ id: "p1", name: "Nuevo título" }))

    expect(invalidated()).toBe(false)
    expect(cached()?.[1]?.isFavorite).toBe(true)

    await act(async () => favorite.resolve())
    await waitFor(() => expect(invalidated()).toBe(true))
  })
})

describe("useDeleteProject", () => {
  beforeEach(() => {
    queryClient.setQueryData(queryKeys.projects.mine(), [summary(), summary({ id: "p2" })])
  })

  it("quita el proyecto solo cuando el servidor confirma el borrado", async () => {
    const request = deferred()
    api.projects.remove.mockReturnValue(request.promise)
    const { result } = renderHook(() => useDeleteProject(), { wrapper })

    act(() => result.current.mutate("p1"))
    await waitFor(() => expect(result.current.isPending).toBe(true))
    expect(cached()).toHaveLength(2)

    await act(async () => request.resolve())
    await waitFor(() => expect(cached()?.map((p) => p.id)).toEqual(["p2"]))
  })

  it("deja la lista intacta si falla", async () => {
    api.projects.remove.mockRejectedValue(new ApiError("forbidden", "0 filas"))
    const { result } = renderHook(() => useDeleteProject(), { wrapper })

    await act(() => result.current.mutateAsync("p1").catch(() => {}))

    expect(cached()).toHaveLength(2)
  })
})
