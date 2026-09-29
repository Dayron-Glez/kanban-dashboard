import { useSyncExternalStore } from "react"

const MOBILE_BREAKPOINT = 768
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

let mediaQuery: MediaQueryList | null = null

const getMediaQuery = () => {
  mediaQuery ??= window.matchMedia(QUERY)
  return mediaQuery
}

// Fuera del hook a propósito: useSyncExternalStore compara estas referencias
// entre renders, y si cambiaran se cancelaría y reharía la suscripción cada vez.
const subscribe = (onStoreChange: () => void) => {
  const mql = getMediaQuery()
  mql.addEventListener("change", onStoreChange)
  return () => mql.removeEventListener("change", onStoreChange)
}

const getSnapshot = () => {
  return getMediaQuery().matches
}

const getServerSnapshot = () => {
  return false
}

export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
