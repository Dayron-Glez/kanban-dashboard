import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query"
import { isApiError, type ApiErrorCode } from "@repo/api-client"
import { toast } from "sonner"
import { errorMessage } from "./errorMessage"

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: {
      /** Título del toast; el detalle lo pone el código del error. */
      errorMessage?: string
      /** La mutación gestiona su error en pantalla y no quiere toast. */
      silent?: boolean
    }
  }
}

const RETRYABLE: ApiErrorCode[] = ["network", "unknown"]
const MAX_RETRIES = 2

const shouldRetry = (failureCount: number, error: unknown) =>
  isApiError(error) && RETRYABLE.includes(error.code) && failureCount < MAX_RETRIES

// El id agrupa: diez consultas caídas por la misma causa dan un solo toast.
const notify = (title: string, description?: string) =>
  toast.error(title, { id: `${title}|${description ?? ""}`, description })

export const createQueryClient = () =>
  new QueryClient({
    queryCache: new QueryCache({
      // Si la carga inicial falla, la pantalla lo muestra en línea. El toast es
      // solo para cuando ya hay datos y lo que falla es la recarga.
      onError: (error, query) => {
        if (query.state.data !== undefined) notify(errorMessage(error))
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        const meta = mutation.options.meta
        if (meta?.silent) return
        if (meta?.errorMessage) notify(meta.errorMessage, errorMessage(error))
        else notify(errorMessage(error))
      },
    }),
    defaultOptions: {
      queries: { staleTime: 30_000, retry: shouldRetry },
      mutations: { retry: false },
    },
  })
