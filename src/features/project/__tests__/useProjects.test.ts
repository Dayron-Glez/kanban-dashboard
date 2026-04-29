import { renderHook, act, waitFor } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { useProjects } from "../hooks/useProjects"

const mockUser = { id: "user-1", email: "test@test.com" }

vi.mock("@/features/auth", () => ({
  useAuth: () => ({ user: mockUser }),
}))

const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockDelete = vi.fn()

vi.mock("@/shared/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      delete: mockDelete,
    })),
  },
}))

describe("useProjects", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("carga proyectos al montar", async () => {
    const projects = [{ id: "p1", name: "Proyecto 1", color: "#3b82f6", owner_id: "user-1", created_at: new Date().toISOString() }]
    mockSelect.mockReturnValue({
      order: vi.fn().mockResolvedValue({ data: projects }),
    })

    const { result } = renderHook(() => useProjects())

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.projects).toEqual(projects)
  })

  it("createProject agrega el proyecto a la lista", async () => {
    const existing = [{ id: "p1", name: "Existente", color: "#3b82f6", owner_id: "user-1", created_at: new Date().toISOString() }]
    const newProject = { id: "p2", name: "Nuevo", color: "#8b5cf6", owner_id: "user-1", created_at: new Date().toISOString() }

    mockSelect.mockReturnValue({
      order: vi.fn().mockResolvedValue({ data: existing }),
    })
    mockInsert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: newProject, error: null }),
      }),
    })

    const { result } = renderHook(() => useProjects())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.createProject({ name: "Nuevo", color: "#8b5cf6" })
    })

    expect(result.current.projects[0]).toEqual(newProject)
    expect(result.current.projects).toHaveLength(2)
  })

  it("deleteProject elimina el proyecto de la lista", async () => {
    const projects = [
      { id: "p1", name: "A", color: "#3b82f6", owner_id: "user-1", created_at: new Date().toISOString() },
      { id: "p2", name: "B", color: "#8b5cf6", owner_id: "user-1", created_at: new Date().toISOString() },
    ]
    mockSelect.mockReturnValue({
      order: vi.fn().mockResolvedValue({ data: projects }),
    })
    mockDelete.mockReturnValue({
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
