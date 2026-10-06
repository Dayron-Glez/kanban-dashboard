import { useEffect, useState } from "react"
import { ThemeContext, type Theme } from "./theme-context"

const THEME_KEY = "cauce.theme"
const LEGACY_THEME_KEY = "theme"

/** Lee la preferencia guardada, migrando la clave anterior si aún existe. */
const readStoredTheme = (): Theme | null => {
  try {
    const saved = localStorage.getItem(THEME_KEY) as Theme | null
    if (saved) return saved

    const legacy = localStorage.getItem(LEGACY_THEME_KEY) as Theme | null
    if (legacy) {
      localStorage.setItem(THEME_KEY, legacy)
      localStorage.removeItem(LEGACY_THEME_KEY)
      return legacy
    }
    return null
  } catch {
    return null
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = readStoredTheme()
    if (saved) return saved
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  })

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // Storage bloqueado: el tema sigue aplicándose, solo no persiste.
    }
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"))

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
}
