import type { Profile, ProjectMember, Task } from "@repo/contracts"

/** Tarea de vista: la de dominio solo guarda el id de quien la tiene asignada. */
export type TaskWithAssignee = Task & { assignee: Profile | null }

export function withAssignees(
  tasks: Task[],
  members: Pick<ProjectMember, "userId" | "profile">[]
): TaskWithAssignee[] {
  const profiles = new Map(members.map((member) => [member.userId, member.profile]))
  return tasks.map((task) => ({
    ...task,
    assignee: task.assigneeId ? (profiles.get(task.assigneeId) ?? null) : null,
  }))
}
