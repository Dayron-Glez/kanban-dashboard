/** Lo que devuelve el cliente de better-auth cuando algo falla. */
export interface AuthClientError {
  code?: string
  status: number
}

const MESSAGES: Partial<Record<string, string>> = {
  INVALID_EMAIL_OR_PASSWORD: "Email o contraseña incorrectos.",
  USER_ALREADY_EXISTS: "Ya existe una cuenta con ese email.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Ya existe una cuenta con ese email.",
  INVALID_EMAIL: "Ese email no es válido.",
  PASSWORD_TOO_SHORT: "La contraseña debe tener al menos 8 caracteres.",
  PASSWORD_TOO_LONG: "La contraseña es demasiado larga.",
}

export const NETWORK_ERROR_MESSAGE =
  "No hay conexión con el servidor. Comprueba tu red e inténtalo de nuevo."

export const authErrorMessage = (error: AuthClientError): string => {
  if (error.status === 429) return "Demasiados intentos. Espera unos minutos y vuelve a probar."
  if (error.status === 0) return NETWORK_ERROR_MESSAGE
  return (error.code && MESSAGES[error.code]) || "No se ha podido completar. Inténtalo de nuevo."
}

const OAUTH_MESSAGES: Partial<Record<string, string>> = {
  account_not_linked: "Ya existe una cuenta con este correo. Entra con tu email y contraseña.",
  access_denied: "Has cancelado el inicio de sesión con Google.",
}

/** El código que better-auth añade a la URL al volver de Google con un error. */
export const oauthErrorMessage = (code: string): string =>
  OAUTH_MESSAGES[code] ?? "No se ha podido entrar con Google. Inténtalo de nuevo."
