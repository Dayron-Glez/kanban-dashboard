import { isApiError, type ApiErrorCode } from "@repo/api-client"

const MESSAGES: Record<ApiErrorCode, string> = {
  network: "No hay conexión con el servidor. Comprueba tu red e inténtalo de nuevo.",
  unauthorized: "Tu sesión ha caducado. Vuelve a iniciar sesión.",
  forbidden: "No tienes permiso para hacer esto.",
  not_found: "No se ha encontrado. Puede que alguien lo haya borrado.",
  conflict: "Ya existe un elemento con esos datos.",
  invalid_input: "Los datos enviados no son válidos.",
  invalid_response: "El servidor ha respondido algo inesperado. Recarga la página.",
  unknown: "Algo ha fallado. Inténtalo de nuevo.",
}

export const errorMessage = (error: unknown): string =>
  isApiError(error) ? MESSAGES[error.code] : MESSAGES.unknown
