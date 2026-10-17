import * as z from "zod"

/** Un participante: alguien del equipo, o el nombre y el email de alguien de fuera. */
export const ElementGuestSchema = z.object({
  crewMemberId: z.uuid().nullable(),
  fullName: z.string().nullable(),
  email: z.string().nullable(),
})
export type ElementGuest = z.infer<typeof ElementGuestSchema>

/**
 * Quién interviene en un elemento: un responsable como mucho, los ejecutantes y
 * los departamentos (del equipo y del proyecto) y los participantes, que reciben
 * la convocatoria.
 */
export const ElementPeopleSchema = z.object({
  responsibleId: z.uuid().nullable(),
  executorIds: z.array(z.uuid()),
  departmentIds: z.array(z.uuid()),
  guests: z.array(ElementGuestSchema),
})
export type ElementPeople = z.infer<typeof ElementPeopleSchema>

export const NO_PEOPLE: ElementPeople = {
  responsibleId: null,
  executorIds: [],
  departmentIds: [],
  guests: [],
}

const GuestInputSchema = z
  .object({
    crewMemberId: z.uuid().nullable().default(null),
    fullName: z.string().trim().max(200).nullable().default(null),
    email: z.email().max(200).nullable().default(null),
  })
  .superRefine((guest, ctx) => {
    if (guest.crewMemberId !== null) {
      if (guest.fullName !== null || guest.email !== null) {
        ctx.addIssue({ code: "custom", path: ["crewMemberId"] })
      }
      return
    }
    if (!guest.fullName) ctx.addIssue({ code: "custom", path: ["fullName"] })
    if (!guest.email) ctx.addIssue({ code: "custom", path: ["email"] })
  })

const repeated = (values: readonly (string | null)[]) => {
  const present = values.filter((value): value is string => value !== null)
  return new Set(present).size !== present.length
}

/** Las personas de un elemento, tal como se guardan: se sustituyen enteras. */
export const PeopleInputSchema = z
  .object({
    responsibleId: z.uuid().nullable().default(null),
    executorIds: z.array(z.uuid()).default([]),
    departmentIds: z.array(z.uuid()).default([]),
    guests: z.array(GuestInputSchema).default([]),
  })
  .superRefine((people, ctx) => {
    // El responsable no es además ejecutante: cada persona, un solo papel.
    const assigned = [people.responsibleId, ...people.executorIds]
    if (repeated(assigned)) ctx.addIssue({ code: "custom", path: ["executorIds"] })
    if (repeated(people.departmentIds)) ctx.addIssue({ code: "custom", path: ["departmentIds"] })
    const guests = people.guests
    if (
      repeated(guests.map((guest) => guest.crewMemberId)) ||
      repeated(guests.map((guest) => guest.email?.toLowerCase() ?? null))
    ) {
      ctx.addIssue({ code: "custom", path: ["guests"] })
    }
  })
export type PeopleInput = z.input<typeof PeopleInputSchema>
export type PeopleData = z.output<typeof PeopleInputSchema>
