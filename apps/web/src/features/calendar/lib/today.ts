import { fromIsoDate, toISODate, type EpochDay } from "@repo/domain"

/** Hoy, en la hora local: el primer día en que se puede planificar. */
export const today = (): EpochDay => fromIsoDate(toISODate(new Date()))
