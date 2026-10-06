import type { ReactNode } from "react"
import type { ApiClient } from "@repo/api-client"
import { ApiContext } from "./apiCtx"

interface ApiProviderProps {
  api: ApiClient
  children: ReactNode
}

export function ApiProvider({ api, children }: Readonly<ApiProviderProps>) {
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>
}
