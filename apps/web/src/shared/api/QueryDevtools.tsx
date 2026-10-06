import { lazy, Suspense } from "react"

// Import dinámico tras import.meta.env.DEV: en producción Vite lo elimina del bundle.
const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import("@tanstack/react-query-devtools").then((m) => ({ default: m.ReactQueryDevtools }))
    )
  : () => null

export function QueryDevtools() {
  return (
    <Suspense>
      <ReactQueryDevtools />
    </Suspense>
  )
}
