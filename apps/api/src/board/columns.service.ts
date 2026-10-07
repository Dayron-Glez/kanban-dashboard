import { Inject, Injectable, NotFoundException } from "@nestjs/common"
import { ColumnSchema, type Column, type ColumnCategory } from "@repo/contracts"
import { applyColumnOrder } from "@repo/domain"
import { and, count, eq, ne } from "drizzle-orm"
import { DB, type Database } from "../db/db.module.js"
import { columns } from "../db/generated/schema.js"
import { ProjectAccess } from "../projects/project-access.js"

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0]

const toColumn = (row: typeof columns.$inferSelect): Column =>
  ColumnSchema.parse({
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    position: row.position,
    category: row.category,
  })

// Solo una columna «done» por proyecto (lo garantiza un índice único): la que
// lo era pasa a «doing» antes, en la misma transacción.
const releaseDone = (tx: Transaction, projectId: string, exceptId?: string) =>
  tx
    .update(columns)
    .set({ category: "doing" })
    .where(
      and(
        eq(columns.projectId, projectId),
        eq(columns.category, "done"),
        exceptId ? ne(columns.id, exceptId) : undefined
      )
    )

@Injectable()
export class ColumnsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(ProjectAccess) private readonly access: ProjectAccess
  ) {}

  async listByProject(userId: string, projectId: string): Promise<Column[]> {
    await this.access.requireMember(projectId, userId)
    const rows = await this.db
      .select()
      .from(columns)
      .where(eq(columns.projectId, projectId))
      .orderBy(columns.position)
    return rows.map(toColumn)
  }

  // Se crea al final del tablero.
  async create(
    userId: string,
    projectId: string,
    input: { title: string; category?: ColumnCategory }
  ): Promise<Column> {
    await this.access.requireOwner(projectId, userId)
    const category = input.category ?? "todo"
    return this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ total: count() })
        .from(columns)
        .where(eq(columns.projectId, projectId))
      if (category === "done") await releaseDone(tx, projectId)
      const [row] = await tx
        .insert(columns)
        .values({ projectId, title: input.title, category, position: existing?.total ?? 0 })
        .returning()
      return toColumn(row!)
    })
  }

  async rename(userId: string, columnId: string, title: string): Promise<void> {
    await this.requireOwnerOf(columnId, userId)
    await this.db.update(columns).set({ title }).where(eq(columns.id, columnId))
  }

  // Sus tareas se van con ella (ON DELETE CASCADE). Quedarse sin columna
  // «done» está permitido.
  async remove(userId: string, columnId: string): Promise<void> {
    await this.requireOwnerOf(columnId, userId)
    await this.db.delete(columns).where(eq(columns.id, columnId))
  }

  // Las que no vengan en la lista (creadas mientras tanto) van detrás, en su
  // orden actual: lo mismo que aplica la web en el estado optimista.
  async reorder(userId: string, projectId: string, orderedColumnIds: string[]): Promise<void> {
    await this.access.requireOwner(projectId, userId)
    await this.db.transaction(async (tx) => {
      const current = await tx
        .select({ id: columns.id, position: columns.position })
        .from(columns)
        .where(eq(columns.projectId, projectId))
        .for("update")
      const before = new Map(current.map((column) => [column.id, column.position]))
      for (const column of applyColumnOrder(current, orderedColumnIds)) {
        if (before.get(column.id) === column.position) continue
        await tx.update(columns).set({ position: column.position }).where(eq(columns.id, column.id))
      }
    })
  }

  async setCategory(userId: string, columnId: string, category: ColumnCategory): Promise<void> {
    const projectId = await this.requireOwnerOf(columnId, userId)
    await this.db.transaction(async (tx) => {
      if (category === "done") await releaseDone(tx, projectId, columnId)
      await tx.update(columns).set({ category }).where(eq(columns.id, columnId))
    })
  }

  private async requireOwnerOf(columnId: string, userId: string): Promise<string> {
    const [column] = await this.db
      .select({ projectId: columns.projectId })
      .from(columns)
      .where(eq(columns.id, columnId))
    if (!column) throw new NotFoundException("La columna no existe")
    await this.access.requireOwner(column.projectId, userId)
    return column.projectId
  }
}
