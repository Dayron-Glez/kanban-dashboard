import { createContext, useContext } from "react"
import type { ApiClient } from "@repo/api-client"

export const ApiContext = createContext<ApiClient | null>(null)

export const useApi = (): ApiClient => {
  const api = useContext(ApiContext)
  if (!api) throw new Error("useApi debe usarse dentro de ApiProvider")
  return api
}
