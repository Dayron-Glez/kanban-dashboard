import type { PostgrestError } from "@supabase/supabase-js"
import * as z from "zod"
import { ApiError, type ApiErrorCode } from "../errors"

const CODE_BY_POSTGREST: Partial<Record<string, ApiErrorCode>> = {
  PGRST116: "not_found",
  PGRST301: "unauthorized",
  "23505": "conflict",
  "42501": "forbidden",
  "23514": "invalid_input",
  "22P02": "invalid_input",
}

// supabase-js no lanza cuando falla el fetch: devuelve un error con status 0.
export const toApiError = (error: PostgrestError, status: number): ApiError => {
  if (status === 0) return new ApiError("network", error.message, { cause: error })
  if (status === 401) return new ApiError("unauthorized", error.message, { cause: error })
  return new ApiError(CODE_BY_POSTGREST[error.code] ?? "unknown", error.message, { cause: error })
}

interface PostgrestResult {
  data: unknown
  error: PostgrestError | null
  status: number
}

// Genérico sobre la respuesta entera: supabase-js la tipa como unión de éxito y
// fallo, y así el tipo de data sale de la rama de éxito.
export const unwrap = <R extends PostgrestResult>({
  data,
  error,
  status,
}: R): NonNullable<R["data"]> => {
  if (error) throw toApiError(error, status)
  if (data === null || data === undefined) {
    throw new ApiError("not_found", "La respuesta no trajo datos")
  }
  return data
}

// Un UPDATE o DELETE que la RLS bloquea no da error: afecta a 0 filas.
export const requireRows = <T>(rows: T[]): T[] => {
  if (rows.length === 0) throw new ApiError("forbidden", "La operación no afectó a ninguna fila")
  return rows
}

export const parseWith = <S extends z.ZodType>(schema: S, value: unknown): z.infer<S> => {
  const result = schema.safeParse(value)
  if (!result.success) {
    throw new ApiError("invalid_response", z.prettifyError(result.error), { cause: result.error })
  }
  return result.data
}
