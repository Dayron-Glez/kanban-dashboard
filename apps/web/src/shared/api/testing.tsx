import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ApiClient, ProjectsRepository } from "@repo/api-client"
import { vi } from "vitest"
import { ApiProvider } from "./ApiProvider"

/** Api falsa tipada contra la interfaz: si el contrato cambia, los tests no compilan. */
export const createFakeApi = () =>
  ({
    projects: {
      listMine: vi.fn<ProjectsRepository["listMine"]>(),
      create: vi.fn<ProjectsRepository["create"]>(),
      rename: vi.fn<ProjectsRepository["rename"]>(),
      remove: vi.fn<ProjectsRepository["remove"]>(),
      setFavorite: vi.fn<ProjectsRepository["setFavorite"]>(),
    },
  }) satisfies ApiClient

export const createTestQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })

export const createWrapper = (api: ApiClient, queryClient = createTestQueryClient()) =>
  function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
    return (
      <ApiProvider api={api}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </ApiProvider>
    )
  }
