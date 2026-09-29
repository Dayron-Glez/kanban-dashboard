import { cn } from "@/shared/lib/utils"

interface CauceLogoProps {
  /** Tamaño del contenedor cuadrado en píxeles. Default 28. */
  size?: number
  /** Mostrar también el wordmark "cauce" a la derecha. */
  showWordmark?: boolean
  /** Solo el SVG, sin el contenedor de fondo (hereda currentColor). */
  unwrapped?: boolean
  className?: string
}

/**
 * Isotipo + wordmark de Cauce — el único icono propio del sistema.
 * El resto de la iconografía viene de `@tabler/icons-react`.
 *
 *   <CauceLogo size={28} />              // solo isotipo
 *   <CauceLogo size={28} showWordmark /> // lockup completo
 *   <CauceLogo size={20} unwrapped />    // svg suelto, hereda color
 */
export function CauceLogo({
  size = 28,
  showWordmark = false,
  unwrapped = false,
  className,
}: CauceLogoProps) {
  const glyphSize = size * (unwrapped ? 1 : 0.6)

  const svg = (
    <svg
      width={glyphSize}
      height={glyphSize}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 9c1.8 0 1.8 1.6 3.6 1.6S8.4 9 10.2 9s1.8 1.6 3.6 1.6S15.6 9 17.4 9s1.8 1.6 3.6 1.6" />
      <path
        d="M3 14.4c1.8 0 1.8 1.6 3.6 1.6s1.8-1.6 3.6-1.6 1.8 1.6 3.6 1.6 1.8-1.6 3.6-1.6 1.8 1.6 3.6 1.6"
        opacity={0.55}
      />
    </svg>
  )

  if (unwrapped) {
    return (
      <span className={cn("inline-flex", className)} aria-label="cauce">
        {svg}
      </span>
    )
  }

  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <span
        className="bg-primary text-primary-foreground inline-flex shrink-0 items-center justify-center"
        style={{ width: size, height: size, borderRadius: size * 0.27 }}
        aria-label="cauce"
      >
        {svg}
      </span>
      {showWordmark && (
        <span
          className="text-primary font-extrabold lowercase"
          style={{ fontSize: size * 0.6, letterSpacing: "-0.02em", lineHeight: 1 }}
        >
          cauce
        </span>
      )}
    </span>
  )
}
