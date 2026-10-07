import type { Task } from "@repo/contracts"
import { describe, expect, it } from "vitest"
import { withAssignees } from "../withAssignees"

const task = (id: string, assigneeId: string | null): Task => ({
  id,
  projectId: "p",
  columnId: "c",
  content: id,
  priority: "p2",
  size: "m",
  dueDate: null,
  position: 0,
  assigneeId,
})

const ana = { id: "u1", fullName: "Ana Ruiz", email: "ana@cauce.test", avatarUrl: null }

describe("withAssignees", () => {
  it("une cada tarea con el perfil de quien la tiene asignada", () => {
    const [result] = withAssignees([task("t1", "u1")], [{ userId: "u1", profile: ana }])
    expect(result?.assignee).toEqual(ana)
  })

  it("deja assignee a null si la tarea no está asignada", () => {
    const [result] = withAssignees([task("t1", null)], [{ userId: "u1", profile: ana }])
    expect(result?.assignee).toBeNull()
  })

  it("deja assignee a null si quien la tenía ya no es miembro", () => {
    const [result] = withAssignees([task("t1", "u2")], [{ userId: "u1", profile: ana }])
    expect(result?.assignee).toBeNull()
  })

  it("conserva el orden y el resto de campos", () => {
    const tasks = [task("t1", null), task("t2", "u1")]
    expect(withAssignees(tasks, []).map((t) => t.id)).toEqual(["t1", "t2"])
  })
})
