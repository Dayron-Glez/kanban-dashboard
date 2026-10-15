import { sql } from "drizzle-orm"
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  text,
  time,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core"
import { users } from "./identity.js"
import { core, crewMembers, departments, projects } from "./projects.js"

export const alerts = core.table(
  "alerts",
  {
    id: uuid()
      .default(sql`uuidv7()`)
      .primaryKey(),
    projectId: uuid("project_id").notNull(),
    title: text().notNull(),
    cause: text().notNull(),
    certainty: text().default("confirmed").notNull(),
    scope: text().notNull(),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on"),
    allDay: boolean("all_day").default(true).notNull(),
    startTime: time("start_time"),
    endTime: time("end_time"),
    hoursMode: text("hours_mode"),
    notes: text(),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: "alerts_project_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: "alerts_created_by_fkey",
    }).onDelete("set null"),
    index("alerts_project_id_starts_on_idx").on(table.projectId, table.startsOn),
    check("alerts_title_check", sql`char_length(${table.title}) between 1 and 120`),
    check(
      "alerts_cause_check",
      sql`${table.cause} in ('unavailability', 'illness', 'strike', 'weather', 'permits', 'supplier', 'other')`
    ),
    check("alerts_certainty_check", sql`${table.certainty} in ('confirmed', 'possible')`),
    check("alerts_scope_check", sql`${table.scope} in ('project', 'targeted')`),
    check("alerts_hours_mode_check", sql`${table.hoursMode} in ('daily', 'continuous')`),
    check(
      "alerts_dates_check",
      sql`${table.endsOn} is null or ${table.endsOn} >= ${table.startsOn}`
    ),
    check(
      "alerts_all_day_check",
      sql`not ${table.allDay} or (${table.startTime} is null and ${table.endTime} is null and ${table.hoursMode} is null)`
    ),
    check("alerts_start_time_check", sql`${table.allDay} or ${table.startTime} is not null`),
    check(
      "alerts_single_day_check",
      sql`${table.allDay} or ${table.endsOn} is distinct from ${table.startsOn} or (${table.hoursMode} is null and ${table.endTime} is not null and ${table.endTime} > ${table.startTime})`
    ),
    check(
      "alerts_several_days_check",
      sql`${table.allDay} or ${table.endsOn} is not distinct from ${table.startsOn} or ${table.hoursMode} is not null`
    ),
    check(
      "alerts_daily_check",
      sql`${table.hoursMode} is distinct from 'daily' or (${table.endTime} is not null and ${table.endTime} > ${table.startTime})`
    ),
    check(
      "alerts_continuous_check",
      sql`${table.hoursMode} is distinct from 'continuous' or (${table.endTime} is null) = (${table.endsOn} is null)`
    ),
  ]
)

export const alertTargets = core.table(
  "alert_targets",
  {
    id: uuid()
      .default(sql`uuidv7()`)
      .primaryKey(),
    alertId: uuid("alert_id").notNull(),
    departmentId: uuid("department_id"),
    crewMemberId: uuid("crew_member_id"),
  },
  (table) => [
    foreignKey({
      columns: [table.alertId],
      foreignColumns: [alerts.id],
      name: "alert_targets_alert_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.departmentId],
      foreignColumns: [departments.id],
      name: "alert_targets_department_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.crewMemberId],
      foreignColumns: [crewMembers.id],
      name: "alert_targets_crew_member_id_fkey",
    }).onDelete("cascade"),
    unique("alert_targets_alert_id_department_id_key").on(table.alertId, table.departmentId),
    unique("alert_targets_alert_id_crew_member_id_key").on(table.alertId, table.crewMemberId),
    check(
      "alert_targets_one_check",
      sql`(${table.departmentId} is null) <> (${table.crewMemberId} is null)`
    ),
  ]
)
