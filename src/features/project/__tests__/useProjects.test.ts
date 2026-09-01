import { renderHook, act, waitFor } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { useProjects } from "../hooks/useProjects"

const mockUser = { id: "user-1", email: "test@test.com" }

vi.mock("@/features/auth", () => ({
  useAuth: () => ({ user: mockUser }),
}))

const mockProjectMembers = {
  select: vi.fn(),
  insert: vi.fn(),
}
const mockProjects = {
  select: vi.fn(),
  insert: vi.fn(),
  delete: vi.fn(),
}
const mockColumns = {
  insert: vi.fn(),
}
const mockTasks = {
  select: vi.fn(),
}

vi.mock("@/shared/supabase", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "project_members") return mockProjectMembers
      if (table === "projects") return mockProjects
      if (table === "columns") return mockColumns
      if (table === "tasks") return mockTasks
      return {}
    }),
  },
}))

describe("useProjects", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("carga proyectos al montar", async () => {
    const memberRows = [{ project_id: "p1", role: "owner" }]
    const projects = [
      {
        id: "p1",
        name: "Proyecto 1",
        color: "#3b82f6",
        owner_id: "user-1",
        created_at: new Date().toISOString(),
      },
    ]

    mockProjectMembers.select.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: memberRows }),
    })
    mockProjects.select.mockReturnValue({
      in: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: projects }),
      }),
    })
    mockTasks.select.mockReturnValue({
      in: vi.fn().mockResolvedValue({ data: [{ project_id: "p1" }, { project_id: "p1" }] }),
    })

    const { result } = renderHook(() => useProjects())

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.projects).toEqual(projects)
    expect(result.current.taskCounts).toEqual({ p1: 2 })
  })

  it("createProject agrega el proyecto a la lista", async () => {
    const memberRows = [{ project_id: "p1", role: "owner" }]
    const existing = [
      {
        id: "p1",
        name: "Existente",
        color: "#3b82f6",
        owner_id: "user-1",
        created_at: new Date().toISOString(),
      },
    ]
    const newProject = {
      id: "p2",
      name: "Nuevo",
      color: "#8b5cf6",
      owner_id: "user-1",
      created_at: new Date().toISOString(),
    }

    mockProjectMembers.select.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: memberRows }),
    })
    mockProjectMembers.insert.mockResolvedValue({ data: null, error: null })
    mockProjects.select.mockReturnValue({
      in: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: existing }),
      }),
    })
    mockTasks.select.mockReturnValue({
      in: vi.fn().mockResolvedValue({ data: [] }),
    })
    mockProjects.insert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: newProject, error: null }),
      }),
    })
    mockColumns.insert.mockResolvedValue({ data: null, error: null })

    const { result } = renderHook(() => useProjects())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.createProject({ name: "Nuevo", color: "#8b5cf6" })
    })

    expect(result.current.projects[0]).toEqual(newProject)
    expect(result.current.projects).toHaveLength(2)
  })

  it("deleteProject elimina el proyecto de la lista", async () => {
    const memberRows = [
      { project_id: "p1", role: "owner" },
      { project_id: "p2", role: "owner" },
    ]
    const projects = [
      {
        id: "p1",
        name: "A",
        color: "#3b82f6",
        owner_id: "user-1",
        created_at: new Date().toISOString(),
      },
      {
        id: "p2",
        name: "B",
        color: "#8b5cf6",
        owner_id: "user-1",
        created_at: new Date().toISOString(),
      },
    ]

    mockProjectMembers.select.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: memberRows }),
    })
    mockProjects.select.mockReturnValue({
      in: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: projects }),
      }),
    })
    mockTasks.select.mockReturnValue({
      in: vi.fn().mockResolvedValue({ data: [] }),
    })
    mockProjects.delete.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })

    const { result } = renderHook(() => useProjects())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.deleteProject("p1")
    })

    expect(result.current.projects).toHaveLength(1)
    expect(result.current.projects[0].id).toBe("p2")
  })
})
