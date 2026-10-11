import type { ProjectKind } from "@repo/contracts"
import { buildCalendarTemplate } from "@repo/domain"
import type { Database } from "../db/db.module.js"
import { elements } from "../db/schema/index.js"

export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0]

// Nivel a nivel, para que cada hijo conozca el id que la base dio a su padre.
export async function insertCalendarTemplate(
  tx: Transaction,
  projectId: string,
  kind: ProjectKind
): Promise<void> {
  const template = buildCalendarTemplate(kind)
  const ids = new Map<string, string>()
  const depth = (key: string) => key.split(".").length
  const maxDepth = Math.max(...template.map((element) => depth(element.key)))

  for (let level = 1; level <= maxDepth; level++) {
    const rows = template.filter((element) => depth(element.key) === level)
    const inserted = await tx
      .insert(elements)
      .values(
        rows.map((element) => ({
          projectId,
          kind: element.kind,
          parentId: element.parentKey ? ids.get(element.parentKey)! : null,
          position: element.position,
          name: element.name,
          color: element.color,
          templateKey: element.key,
        }))
      )
      .returning({ id: elements.id, templateKey: elements.templateKey })
    for (const row of inserted) ids.set(row.templateKey!, row.id)
  }
}
