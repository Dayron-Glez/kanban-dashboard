import type { AlertCause, AlertCertainty, AlertScope, HoursMode } from "@repo/contracts"

export const ALERT_CAUSE_LABELS: Record<AlertCause, string> = {
  unavailability: "Indisponibilidad",
  illness: "Enfermedad",
  strike: "Huelga",
  weather: "Meteorología",
  permits: "Permisos",
  supplier: "Proveedor",
  other: "Otro",
}

export const ALERT_CERTAINTY_LABELS: Record<AlertCertainty, string> = {
  confirmed: "Segura",
  possible: "Posible",
}

export const ALERT_SCOPE_LABELS: Record<AlertScope, string> = {
  project: "Todo el proyecto",
  targeted: "Personas y departamentos",
}

export const HOURS_MODE_LABELS: Record<HoursMode, string> = {
  daily: "Cada día",
  continuous: "Seguido",
}
