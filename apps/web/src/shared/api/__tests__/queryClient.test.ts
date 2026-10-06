import { ApiError } from "@repo/api-client"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createQueryClient } from "../queryClient"

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

const networkError = () => new ApiError("network", "fetch failed")

let queryClient: ReturnType<typeof createQueryClient>

beforeEach(() => {
  vi.mocked(toast.error).mockClear()
  queryClient = createQueryClient()
})

const failQuery = (hasData: boolean, error: unknown = new ApiError("forbidden", "no")) => {
  if (hasData) queryClient.setQueryData(["algo"], "datos previos")
  return queryClient
    .fetchQuery({
      queryKey: ["algo"],
      queryFn: () => Promise.reject(error),
      retry: false,
      staleTime: 0,
    })
    .catch(() => {})
}

const failMutation = (meta?: { errorMessage?: string; silent?: boolean }) =>
  queryClient
    .getMutationCache()
    .build(queryClient, { mutationFn: () => Promise.reject(networkError()), meta })
    .execute(undefined)
    .catch(() => {})

describe("política de toasts", () => {
  it("no avisa con toast si falla la carga inicial: lo muestra la pantalla", async () => {
    await failQuery(false)
    expect(toast.error).not.toHaveBeenCalled()
  })

  it("avisa con toast si falla una recarga con datos ya en pantalla", async () => {
    await failQuery(true)
    expect(toast.error).toHaveBeenCalledWith(
      "No tienes permiso para hacer esto.",
      expect.anything()
    )
  })

  it("una mutación fallida avisa con su título y el motivo como detalle", async () => {
    await failMutation({ errorMessage: "No se pudo crear el proyecto" })
    expect(toast.error).toHaveBeenCalledWith(
      "No se pudo crear el proyecto",
      expect.objectContaining({ description: expect.stringMatching(/conexión/) })
    )
  })

  it("una mutación silenciosa no avisa", async () => {
    await failMutation({ silent: true })
    expect(toast.error).not.toHaveBeenCalled()
  })

  it("errores iguales comparten id para que sonner los agrupe en un toast", async () => {
    await failMutation()
    await failMutation()
    const [first, second] = vi.mocked(toast.error).mock.calls
    expect(first?.[1]?.id).toBeDefined()
    expect(first?.[1]?.id).toBe(second?.[1]?.id)
  })
})

describe("política de reintentos", () => {
  const retry = () =>
    queryClient.getDefaultOptions().queries?.retry as (n: number, e: unknown) => boolean

  it("reintenta los fallos de red hasta dos veces", () => {
    expect(retry()(0, networkError())).toBe(true)
    expect(retry()(1, networkError())).toBe(true)
    expect(retry()(2, networkError())).toBe(false)
  })

  it.each(["forbidden", "not_found", "invalid_response", "unauthorized"] as const)(
    "no reintenta %s: repetir no lo arregla",
    (code) => {
      expect(retry()(0, new ApiError(code, "x"))).toBe(false)
    }
  )
})
