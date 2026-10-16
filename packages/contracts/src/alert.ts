import * as z from "zod"
import { AlertCauseSchema, AlertCertaintySchema, AlertScopeSchema } from "./enums.js"
import { OpenWhenSchema } from "./when.js"

/**
 * Un suceso que impide hacer algo durante unas fechas: una huelga, una baja,
 * alguien que no está disponible. Afecta a todo el proyecto o a sus personas y
 * departamentos; una alerta de personas cuyos destinos se borran sigue siéndolo.
 */
export const AlertSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  title: z.string(),
  cause: AlertCauseSchema,
  certainty: AlertCertaintySchema,
  scope: AlertScopeSchema,
  departmentIds: z.array(z.uuid()),
  crewMemberIds: z.array(z.uuid()),
  when: OpenWhenSchema,
  notes: z.string().nullable(),
  createdBy: z.uuid().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
})
export type Alert = z.infer<typeof AlertSchema>

const alertFields = {
  title: z.string().trim().min(1).max(120),
  cause: AlertCauseSchema,
  certainty: AlertCertaintySchema,
  scope: AlertScopeSchema,
  departmentIds: z.array(z.uuid()),
  crewMemberIds: z.array(z.uuid()),
  when: OpenWhenSchema,
  notes: z.string().trim().max(2000).nullable(),
}

type ScopeFields = {
  scope?: z.infer<typeof AlertScopeSchema>
  departmentIds?: string[]
  crewMemberIds?: string[]
}

const repeats = (ids: string[] = []) => new Set(ids).size !== ids.length

// El alcance va entero: todo el proyecto sin destinos, o al menos uno y sin repetir.
const checkScope = (input: ScopeFields, ctx: z.RefinementCtx) => {
  const { scope, departmentIds, crewMemberIds } = input
  if (scope === undefined) {
    if (departmentIds !== undefined || crewMemberIds !== undefined) {
      ctx.addIssue({ code: "custom", path: ["scope"] })
    }
    return
  }
  const targets = (departmentIds?.length ?? 0) + (crewMemberIds?.length ?? 0)
  if ((scope === "project") !== (targets === 0)) {
    ctx.addIssue({ code: "custom", path: ["scope"] })
  }
  if (repeats(departmentIds)) ctx.addIssue({ code: "custom", path: ["departmentIds"] })
  if (repeats(crewMemberIds)) ctx.addIssue({ code: "custom", path: ["crewMemberIds"] })
}

export const CreateAlertInputSchema = z
  .object({
    ...alertFields,
    certainty: AlertCertaintySchema.default("confirmed"),
    departmentIds: alertFields.departmentIds.default([]),
    crewMemberIds: alertFields.crewMemberIds.default([]),
    notes: alertFields.notes.default(null),
  })
  .superRefine(checkScope)
export type CreateAlertInput = z.infer<typeof CreateAlertInputSchema>

/** El «Cuándo» y el alcance se cambian enteros: con el alcance, sus destinos. */
export const UpdateAlertInputSchema = z
  .object(alertFields)
  .partial()
  .refine((input) => Object.keys(input).length > 0)
  .superRefine(checkScope)
export type UpdateAlertInput = z.infer<typeof UpdateAlertInputSchema>

/** «Lo asumo»: el conflicto de una alerta con un elemento está revisado y deja de avisar. */
export const AlertConflictReviewSchema = z.object({
  alertId: z.uuid(),
  elementId: z.uuid(),
  reviewedBy: z.uuid().nullable(),
  reviewedAt: z.iso.datetime({ offset: true }),
})
export type AlertConflictReview = z.infer<typeof AlertConflictReviewSchema>
