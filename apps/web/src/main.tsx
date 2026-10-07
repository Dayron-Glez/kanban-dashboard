import { StrictMode } from "react"
import "@fontsource-variable/inter/opsz.css"
import "@fontsource/jetbrains-mono/500.css"
import "@fontsource/jetbrains-mono/600.css"
import { createRoot } from "react-dom/client"
import { QueryClientProvider } from "@tanstack/react-query"
import { createSupabaseApi } from "@repo/api-client"
import App from "./App.tsx"
import { ErrorBoundary, ThemeProvider, Toaster } from "@/shared/index"
import { ApiProvider, createQueryClient, QueryDevtools } from "@/shared/api"
import { supabase } from "@/shared/supabase"

const api = createSupabaseApi(supabase)
const queryClient = createQueryClient()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <ErrorBoundary>
        <ApiProvider api={api}>
          <QueryClientProvider client={queryClient}>
            <App />
            <Toaster position="bottom-right" richColors />
            <QueryDevtools />
          </QueryClientProvider>
        </ApiProvider>
      </ErrorBoundary>
    </ThemeProvider>
  </StrictMode>
)
