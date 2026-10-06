import { isAuthRetryableFetchError, type AuthError } from "@supabase/supabase-js"

const MESSAGES: Partial<Record<string, string>> = {
  invalid_credentials: "Email o contraseña incorrectos.",
  email_not_confirmed: "Confirma tu email antes de entrar. Revisa tu bandeja de entrada.",
  user_already_exists: "Ya existe una cuenta con ese email.",
  email_exists: "Ya existe una cuenta con ese email.",
  email_address_invalid: "Ese email no es válido.",
  weak_password: "La contraseña es demasiado débil. Prueba con una más larga.",
  over_request_rate_limit: "Demasiados intentos. Espera unos minutos y vuelve a probar.",
  over_email_send_rate_limit: "Demasiados emails enviados. Espera unos minutos y vuelve a probar.",
  signup_disabled: "El registro está desactivado.",
}

export const authErrorMessage = (error: AuthError): string => {
  if (isAuthRetryableFetchError(error)) {
    return "No hay conexión con el servidor. Comprueba tu red e inténtalo de nuevo."
  }
  return (error.code && MESSAGES[error.code]) || "No se ha podido completar. Inténtalo de nuevo."
}
