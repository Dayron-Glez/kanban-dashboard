import { useSearchParams } from "react-router"

/**
 * Una elección que va en la URL (la vista, el zoom…), para que un enlace abra lo
 * mismo que se ve. Cambiarla no añade una entrada al historial.
 */
export function useUrlChoice<T extends string>(key: string, parse: (raw: string | null) => T) {
  const [searchParams, setSearchParams] = useSearchParams()
  const change = (next: T) =>
    setSearchParams(
      (params) => {
        params.set(key, next)
        return params
      },
      { replace: true }
    )
  return [parse(searchParams.get(key)), change] as const
}
