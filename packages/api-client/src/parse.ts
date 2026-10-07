import * as z from "zod"
import { ApiError } from "./errors"

/** Valida una respuesta contra su contrato. Común a los dos transportes. */
export const parseWith = <S extends z.ZodType>(schema: S, value: unknown): z.infer<S> => {
  const result = schema.safeParse(value)
  if (!result.success) {
    throw new ApiError("invalid_response", z.prettifyError(result.error), { cause: result.error })
  }
  return result.data
}
