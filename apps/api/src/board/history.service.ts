import { Inject, Injectable } from "@nestjs/common"
import { TaskHistoryEntrySchema, type TaskHistoryEntry } from "@repo/contracts"
import { desc, eq } from "drizzle-orm"
import { DB, type Database } from "../db/db.module.js"
import { taskHistory, tasks } from "../db/schema/index.js"
import { toIso } from "../db/timestamps.js"
import { ProjectAccess } from "../projects/project-access.js"

@Injectable()
export class HistoryService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(ProjectAccess) private readonly access: ProjectAccess
  ) {}

  // Movimientos entre columnas, del más reciente al más antiguo. task_history
  // no guarda el proyecto: se llega a él por la tarea.
  async listByProject(userId: string, projectId: string): Promise<TaskHistoryEntry[]> {
    await this.access.requireMember(projectId, userId)
    const rows = await this.db
      .select({ entry: taskHistory, taskContent: tasks.content })
      .from(taskHistory)
      .innerJoin(tasks, eq(tasks.id, taskHistory.taskId))
      .where(eq(tasks.projectId, projectId))
      .orderBy(desc(taskHistory.movedAt))

    return rows.map(({ entry, taskContent }) =>
      TaskHistoryEntrySchema.parse({
        id: entry.id,
        taskId: entry.taskId,
        taskContent,
        fromColumnId: entry.fromColumnId,
        toColumnId: entry.toColumnId,
        movedAt: toIso(entry.movedAt),
      })
    )
  }
}
