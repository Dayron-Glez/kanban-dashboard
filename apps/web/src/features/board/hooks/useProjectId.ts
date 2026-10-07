import { useParams } from "react-router"

/** Id del proyecto de la ruta actual, o "" fuera de las rutas de proyecto. */
export const useProjectId = (): string => useParams<{ id: string }>().id ?? ""
