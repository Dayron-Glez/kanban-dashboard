import type { Department, Project } from "@repo/contracts"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createTestApp, type TestUser } from "../testing/test-app.js"

// Las reglas del «Cuándo» y de los destinos, en la propia base: lo que la API
// valida con los contratos tampoco entra por otro camino.
let ctx: Awaited<ReturnType<typeof createTestApp>>
let ana: TestUser
let project: Project

type Row = Record<string, string | boolean | null>

const insertAlert = async (when: Row, scope = "project") => {
  const [row] = await ctx.sql<{ id: string }[]>`
    insert into core.alerts ${ctx.sql({
      project_id: project.id,
      title: "Huelga",
      cause: "strike",
      scope,
      starts_on: "2026-10-16",
      ...when,
    })}
    returning id`
  return row!.id
}

const rejected = async (when: Row) => {
  const error = await insertAlert(when).catch((caught: { constraint_name?: string }) => caught)
  return typeof error === "string" ? null : error.constraint_name
}

beforeAll(async () => {
  ctx = await createTestApp()
  ana = await ctx.createUser("ana")
  project = (await ctx.as(ana).post("/projects", { name: "Película", color: "#ef4444" }))
    .body as Project
})

afterAll(async () => {
  await ctx?.close()
})

describe("el «Cuándo» de una alerta en la base", () => {
  it("admite cada forma del «Cuándo»", async () => {
    const hours = { all_day: false, start_time: "09:00", end_time: "14:00" }
    const shapes: Row[] = [
      { ends_on: "2026-10-16" },
      { ends_on: "2026-10-20" },
      { ends_on: "2026-10-16", ...hours },
      { ends_on: "2026-10-20", ...hours, hours_mode: "daily" },
      {
        ends_on: "2026-10-18",
        all_day: false,
        start_time: "22:00",
        end_time: "06:00",
        hours_mode: "continuous",
      },
      { ends_on: null },
      { ends_on: null, ...hours, hours_mode: "daily" },
      { ends_on: null, all_day: false, start_time: "22:00", hours_mode: "continuous" },
    ]
    for (const when of shapes) await insertAlert(when)
  })

  it("rechaza lo que incumple cada regla", async () => {
    expect(await rejected({ ends_on: "2026-10-15" })).toBe("alerts_dates_check")
    expect(await rejected({ ends_on: "2026-10-16", start_time: "09:00" })).toBe(
      "alerts_all_day_check"
    )
    expect(await rejected({ ends_on: "2026-10-16", all_day: false, end_time: "14:00" })).toBe(
      "alerts_start_time_check"
    )
    expect(
      await rejected({
        ends_on: "2026-10-16",
        all_day: false,
        start_time: "14:00",
        end_time: "09:00",
      })
    ).toBe("alerts_single_day_check")
    expect(
      await rejected({
        ends_on: "2026-10-18",
        all_day: false,
        start_time: "09:00",
        end_time: "14:00",
      })
    ).toBe("alerts_several_days_check")
    expect(
      await rejected({
        ends_on: "2026-10-18",
        all_day: false,
        start_time: "22:00",
        end_time: "06:00",
        hours_mode: "daily",
      })
    ).toBe("alerts_daily_check")
    expect(
      await rejected({
        ends_on: "2026-10-18",
        all_day: false,
        start_time: "22:00",
        hours_mode: "continuous",
      })
    ).toBe("alerts_continuous_check")
    expect(await rejected({ ends_on: "2026-10-16", cause: "fire" })).toBe("alerts_cause_check")
    expect(await rejected({ ends_on: "2026-10-16", title: "" })).toBe("alerts_title_check")
  })
})

describe("los destinos de una alerta en la base", () => {
  it("son un departamento o una persona, sin repetir, y se borran con ellos", async () => {
    const alertId = await insertAlert({ ends_on: "2026-10-16" }, "targeted")
    const departments = (await ctx.as(ana).get(`/projects/${project.id}/departments`))
      .body as Department[]
    const [crewMember] = await ctx.sql<{ id: string }[]>`
      insert into core.crew_members (project_id, full_name)
      values (${project.id}, ${"Lola"}) returning id`

    await ctx.sql`
      insert into core.alert_targets (alert_id, department_id) values (${alertId}, ${departments[0]!.id})`
    await ctx.sql`
      insert into core.alert_targets (alert_id, crew_member_id) values (${alertId}, ${crewMember!.id})`

    const violation = (query: Promise<unknown>) =>
      query.catch((caught: { constraint_name?: string }) => caught.constraint_name)
    expect(
      await violation(ctx.sql`insert into core.alert_targets (alert_id) values (${alertId})`)
    ).toBe("alert_targets_one_check")
    expect(
      await violation(
        ctx.sql`insert into core.alert_targets (alert_id, department_id) values (${alertId}, ${departments[0]!.id})`
      )
    ).toBe("alert_targets_alert_id_department_id_key")

    await ctx.sql`delete from core.departments where id = ${departments[0]!.id}`
    await ctx.sql`delete from core.crew_members where id = ${crewMember!.id}`
    const [alert] = await ctx.sql<{ scope: string; targets: number }[]>`
      select scope, (select count(*)::int from core.alert_targets where alert_id = ${alertId}) as targets
      from core.alerts where id = ${alertId}`
    expect(alert).toEqual({ scope: "targeted", targets: 0 })
  })
})
