import { IconArrowLeft } from "@tabler/icons-react"
import { Link } from "react-router"
import { Button } from "@/shared/components/ui/button"

/**
 * 404 del producto. Antes cualquier URL inválida dejaba una pantalla en blanco
 * porque no había ruta comodín.
 */
export function NotFoundPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-muted-foreground/60 text-4xl font-extrabold tabular-nums">404</p>
      <div>
        <h1 className="text-foreground text-lg font-bold">Esta página no existe</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          El enlace puede estar roto o el contenido haberse movido.
        </p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link to="/home">
          <IconArrowLeft className="mr-1 h-4 w-4" />
          Volver al inicio
        </Link>
      </Button>
    </div>
  )
}
