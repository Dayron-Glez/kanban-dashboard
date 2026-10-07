import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type {
  ApiClient,
  ColumnsRepository,
  HistoryRepository,
  InvitationsRepository,
  MembersRepository,
  ProjectsRepository,
  TasksRepository,
} from "@repo/api-client"
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
    members: {
      listByProject: vi.fn<MembersRepository["listByProject"]>(),
      remove: vi.fn<MembersRepository["remove"]>(),
    },
    invitations: {
      listPending: vi.fn<InvitationsRepository["listPending"]>(),
      create: vi.fn<InvitationsRepository["create"]>(),
      cancel: vi.fn<InvitationsRepository["cancel"]>(),
      findByToken: vi.fn<InvitationsRepository["findByToken"]>(),
      accept: vi.fn<InvitationsRepository["accept"]>(),
    },
    columns: {
      listByProject: vi.fn<ColumnsRepository["listByProject"]>(),
      create: vi.fn<ColumnsRepository["create"]>(),
      rename: vi.fn<ColumnsRepository["rename"]>(),
      remove: vi.fn<ColumnsRepository["remove"]>(),
      reorder: vi.fn<ColumnsRepository["reorder"]>(),
    },
    tasks: {
      listByProject: vi.fn<TasksRepository["listByProject"]>(),
      listAssignedToMe: vi.fn<TasksRepository["listAssignedToMe"]>(),
      create: vi.fn<TasksRepository["create"]>(),
      update: vi.fn<TasksRepository["update"]>(),
      remove: vi.fn<TasksRepository["remove"]>(),
      move: vi.fn<TasksRepository["move"]>(),
    },
    history: {
      listByProject: vi.fn<HistoryRepository["listByProject"]>(),
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
