import { DEFAULT_COLUMNS } from "@repo/contracts"
import { buildCalendarTemplate, buildTemplateDependencies, EXAMPLE_PROJECT } from "@repo/domain"
import { and, eq, like } from "drizzle-orm"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { insertCalendarTemplate } from "../src/calendar/calendar-template.js"
import { recalculatePlan } from "../src/calendar/plan.js"
import * as schema from "../src/db/schema/index.js"

// El proyecto de ejemplo del productor, con su plan completo, para el usuario
// del seed. Idempotente: borra el que hubiera y lo vuelve a crear.

const EMAIL = process.env.SEED_EMAIL ?? "dayronglez01@gmail.com"
const SEED_MARK = "[seed]"
const { columns, elementDependencies, elements, projectMembers, projects, users } = schema

const url = process.env.DATABASE_URL ?? ""
if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname)) {
  console.error("El seed solo corre contra la base local")
  process.exit(1)
}

const sql = postgres(url, { max: 1, onnotice: () => {} })
const db = drizzle(sql, { schema })

try {
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, EMAIL))
  if (!user) {
    console.log(
      `No existe ningún usuario con el email ${EMAIL}. Regístrate en la app y vuelve a sembrar.`
    )
    process.exit(0)
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(projects)
      .where(
        and(
          eq(projects.ownerId, user.id),
          eq(projects.name, EXAMPLE_PROJECT.name),
          like(projects.description, `%${SEED_MARK}`)
        )
      )

    const [project] = await tx
      .insert(projects)
      .values({
        ownerId: user.id,
        kind: "film",
        name: EXAMPLE_PROJECT.name,
        description: `El proyecto de ejemplo del productor, con su plan completo ${SEED_MARK}`,
        color: "#81DAD9",
      })
      .returning()
    await tx
      .insert(projectMembers)
      .values({ projectId: project!.id, userId: user.id, role: "owner" })
    await tx
      .insert(columns)
      .values(
        DEFAULT_COLUMNS.map((column, position) => ({ ...column, projectId: project!.id, position }))
      )
    await insertCalendarTemplate(tx, project!.id, "film")

    const rows = await tx
      .select({ id: elements.id, key: elements.templateKey })
      .from(elements)
      .where(eq(elements.projectId, project!.id))
    const idOf = new Map(rows.map((row) => [row.key!, row.id]))

    for (const [key, duration] of Object.entries(EXAMPLE_PROJECT.durations)) {
      await tx
        .update(elements)
        .set({ durationAmount: duration.amount, durationUnit: duration.unit })
        .where(eq(elements.id, idOf.get(key)!))
    }
    for (const [key, date] of Object.entries(EXAMPLE_PROJECT.fixedStarts)) {
      await tx
        .update(elements)
        .set({ startsOn: date })
        .where(eq(elements.id, idOf.get(key)!))
    }

    // Sus reglas propias sustituyen a las de la plantilla en esos extremos.
    for (const rule of EXAMPLE_PROJECT.rules) {
      await tx
        .delete(elementDependencies)
        .where(
          and(
            eq(elementDependencies.successorId, idOf.get(rule.successorKey)!),
            eq(elementDependencies.successorPoint, rule.successorPoint)
          )
        )
    }
    await tx.insert(elementDependencies).values(
      EXAMPLE_PROJECT.rules.map((rule) => ({
        projectId: project!.id,
        predecessorId: idOf.get(rule.predecessorKey)!,
        successorId: idOf.get(rule.successorKey)!,
        predecessorPoint: rule.predecessorPoint,
        successorPoint: rule.successorPoint,
        lagAmount: rule.lagAmount,
        lagUnit: rule.lagUnit,
      }))
    )

    const plan = await recalculatePlan(tx, project!.id)
    const mismatches = Object.entries(EXAMPLE_PROJECT.expectedDates).filter(([key, expected]) => {
      const element = plan.elements.find((candidate) => candidate.id === idOf.get(key))
      return element?.startsOn !== expected[0] || element?.endsOn !== expected[1]
    })
    if (mismatches.length) {
      throw new Error(
        `Fechas distintas de las del productor en: ${mismatches.map(([key]) => key).join(", ")}`
      )
    }
  })

  const template = buildCalendarTemplate("film")
  console.log(
    `Proyecto de ejemplo sembrado para ${EMAIL}: ${template.length} elementos, ` +
      `${buildTemplateDependencies(template).length} dependencias y las 12 fechas del productor.`
  )
} finally {
  await sql.end()
}
