import * as z from "zod"

// Las reglas propias (superRefine) no traen mensaje: se pone aquí, por campo.
const CUSTOM: Record<string, string> = {
  endsOn: "El fin no puede ir antes del inicio",
  "hours.startTime": "Falta la hora de inicio",
  "hours.endTime": "La hora de fin tiene que ser posterior a la de inicio",
  "hours.hoursMode": "Con horas y varios días, elige si son cada día o seguidas",
  "hours.allDay": "La contratación es siempre de días completos",
  completed: "Solo las tareas se marcan como hechas",
  videoApp: "Solo las reuniones tienen videollamada",
  videoUrl: "Elige antes la app de la videollamada",
}

const FORMATS: Record<string, string> = {
  url: "Tiene que ser un enlace que empiece por https://",
  email: "Escribe un email válido",
  date: "Escribe una fecha válida",
  time: "Escribe una hora válida, como 09:30",
  uuid: "Elige una opción de la lista",
}

/**
 * Los mensajes de los formularios, en español y en lenguaje normal. Lo que no
 * está aquí lo traduce Zod (`z.locales.es`). Los esquemas de contracts siguen
 * sin mensajes: la API no los necesita.
 */
export const formErrorMap: z.core.$ZodErrorMap = (issue) => {
  switch (issue.code) {
    case "custom":
      return CUSTOM[issue.path?.join(".") ?? ""]
    case "too_small":
      if (issue.origin === "string") {
        return Number(issue.minimum) <= 1
          ? "Hace falta rellenarlo"
          : `Al menos ${issue.minimum} caracteres`
      }
      if (issue.origin === "number") return `Como mínimo ${issue.minimum}`
      return undefined
    case "too_big":
      if (issue.origin === "string") return `Como mucho ${issue.maximum} caracteres`
      if (issue.origin === "number") return `Como mucho ${issue.maximum}`
      return undefined
    case "invalid_format":
      return FORMATS[issue.format]
    case "invalid_type":
      return issue.input === undefined || issue.input === null ? "Hace falta rellenarlo" : undefined
    default:
      return undefined
  }
}

/** Se llama una vez al arrancar la app (y en los tests). */
export const configureFormErrors = () => z.config({ ...z.locales.es(), customError: formErrorMap })
