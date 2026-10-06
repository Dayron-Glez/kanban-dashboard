import { Component, type ReactNode } from "react"
import { Button } from "./ui/button"

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

/**
 * Última red: un error de render que nadie captura deja la pantalla en blanco.
 * React solo permite capturarlos con un componente de clase.
 */
export class ErrorBoundary extends Component<Readonly<ErrorBoundaryProps>, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="bg-background flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <div>
          <h1 className="text-foreground text-lg font-bold">Algo ha fallado</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Recarga la página. Si vuelve a pasar, avísanos.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          Recargar
        </Button>
      </div>
    )
  }
}
