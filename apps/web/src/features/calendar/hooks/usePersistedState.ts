import { useState } from "react"

/**
 * Un ajuste que se recuerda en este navegador: parte de lo guardado y cada
 * cambio se guarda. `load` y `save` saben dónde y cómo (y qué hacer si falla).
 */
export function usePersistedState<T>(load: () => T, save: (value: T) => void) {
  const [value, setValue] = useState<T>(load)
  const change = (next: T) => {
    setValue(next)
    save(next)
  }
  return [value, change] as const
}
