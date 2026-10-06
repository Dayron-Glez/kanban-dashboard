export type ApiErrorCode =
  | "network"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "invalid_input"
  | "invalid_response"
  | "unknown"

export class ApiError extends Error {
  readonly code: ApiErrorCode

  constructor(code: ApiErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = "ApiError"
    this.code = code
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError
