import type * as z from "zod"
import { ApiError, type ApiErrorCode } from "../errors"
import { parseWith } from "../parse"

export interface HttpClientOptions {
  baseUrl: string
  /** El token de la sesión actual, o null si no hay sesión. */
  getAccessToken: () => Promise<string | null>
  fetch?: typeof fetch
}

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE"

interface RequestOptions<S extends z.ZodType | undefined> {
  body?: unknown
  /** Contrato de la respuesta. Sin él, la respuesta se descarta (204 o sin interés). */
  schema?: S
}

type Result<S> = S extends z.ZodType ? z.infer<S> : void

export interface HttpClient {
  request<S extends z.ZodType | undefined = undefined>(
    method: Method,
    path: string,
    options?: RequestOptions<S>
  ): Promise<Result<S>>
}

const CODE_BY_STATUS: Partial<Record<number, ApiErrorCode>> = {
  400: "invalid_input",
  401: "unauthorized",
  403: "forbidden",
  404: "not_found",
  409: "conflict",
  422: "invalid_input",
}

// Nest responde { message, statusCode }, y message puede ser una lista cuando
// falla la validación de varios campos.
const messageOf = async (response: Response): Promise<string> => {
  try {
    const body: unknown = await response.json()
    if (body && typeof body === "object" && "message" in body) {
      const { message } = body as { message: unknown }
      if (Array.isArray(message)) return message.join(". ")
      if (typeof message === "string") return message
    }
  } catch {
    // Cuerpo vacío o que no es JSON: se usa el texto del estado.
  }
  return response.statusText || `Error ${response.status}`
}

export const createHttpClient = ({
  baseUrl,
  getAccessToken,
  fetch: fetchImpl = globalThis.fetch,
}: HttpClientOptions): HttpClient => {
  // Se unen como texto y no con new URL(path, base), que descartaría una ruta
  // en la base: con la API bajo /api, /api + /me acabaría en /me.
  const root = baseUrl.replace(/\/+$/, "")

  async function request<S extends z.ZodType | undefined = undefined>(
    method: Method,
    path: string,
    options: RequestOptions<S> = {}
  ): Promise<Result<S>> {
    const token = await getAccessToken()
    const headers: Record<string, string> = { Accept: "application/json" }
    if (token) headers.Authorization = `Bearer ${token}`
    if (options.body !== undefined) headers["Content-Type"] = "application/json"

    let response: Response
    try {
      response = await fetchImpl(`${root}${path}`, {
        method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      })
    } catch (error) {
      throw new ApiError("network", "No se pudo conectar con la API", { cause: error })
    }

    if (!response.ok) {
      throw new ApiError(CODE_BY_STATUS[response.status] ?? "unknown", await messageOf(response))
    }

    if (!options.schema) return undefined as Result<S>
    let body: unknown
    try {
      body = await response.json()
    } catch (error) {
      throw new ApiError("invalid_response", "La respuesta no es JSON", { cause: error })
    }
    return parseWith(options.schema, body) as Result<S>
  }

  return { request }
}
