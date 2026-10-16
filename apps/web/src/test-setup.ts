import "@testing-library/jest-dom"
import { configureFormErrors } from "@/shared/lib/formErrors"

configureFormErrors()

// jsdom no trae matchMedia, y useIsMobile lo usa para saber si es móvil.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}

// Ni ResizeObserver, que usa el buscador de cmdk.
if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
