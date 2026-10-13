import type { CSSProperties } from "react"

/**
 * Los colores de una fase: se guarda uno solo y de él salen los de cada tema,
 * con el mismo tono. El relleno es el mismo pastel en los dos; en claro lleva
 * además un borde fino del mismo tono, más oscuro, que lo separa del fondo.
 * Las clases `phase-*` de tailwind.css eligen el juego de cada tema.
 */

type Oklch = [l: number, c: number, h: number]

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
const fromLinear = (v: number) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055)

export function hexToOklch(hex: string): Oklch {
  const [r, g, b] = [1, 3, 5].map((i) => toLinear(parseInt(hex.slice(i, i + 2), 16) / 255)) as [
    number,
    number,
    number,
  ]
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return [L, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360]
}

const linearRgb = ([L, C, H]: Oklch) => {
  const A = C * Math.cos((H * Math.PI) / 180)
  const B = C * Math.sin((H * Math.PI) / 180)
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

const inGamut = (color: Oklch) => linearRgb(color).every((v) => v >= -1e-4 && v <= 1 + 1e-4)

/**
 * A hexadecimal. Si el color no cabe en la pantalla (sRGB), se baja el croma
 * hasta que quepa: la luminosidad y el tono se conservan.
 */
export function oklchToHex(color: Oklch): string {
  const [L, chroma, H] = color
  let C = chroma
  if (!inGamut(color)) {
    let low = 0
    for (let step = 0; step < 24; step++) {
      const middle = (low + C) / 2
      if (inGamut([L, middle, H])) low = middle
      else C = middle
    }
    C = low
  }
  return `#${linearRgb([L, C, H])
    .map((v) => Math.round(Math.min(1, Math.max(0, fromLinear(v))) * 255))
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")}`
}

// Luminosidad fija y croma escalado: así todas las fases quedan igual de legibles.
const tone = (hex: string, lightness: number, chroma: number) => {
  const [, c, h] = hexToOklch(hex)
  return oklchToHex([lightness, c * chroma, h])
}

/** Los colores de una fase en los dos temas. */
export function phaseTones(hex: string) {
  return {
    light: {
      fill: tone(hex, 0.84, 1.15),
      edge: tone(hex, 0.5, 1.4),
      childFill: tone(hex, 0.91, 0.7),
      childEdge: tone(hex, 0.6, 1.1),
      ink: tone(hex, 0.5, 1.4),
    },
    dark: {
      fill: tone(hex, 0.84, 1.15),
      childFill: tone(hex, 0.66, 0.95),
      ink: tone(hex, 0.84, 1.15),
    },
  }
}

/** El texto dentro de una barra de fase: oscuro, en los dos temas. */
export const PHASE_TEXT = "#0f172a"

const NEUTRAL = "#8b9aab"

/** Las variables que leen las clases `phase-*`; sin color, un gris neutro. */
export function phaseVars(hex: string | null | undefined): CSSProperties {
  const { light, dark } = phaseTones(hex ?? NEUTRAL)
  return {
    "--phase-fill": light.fill,
    "--phase-edge": light.edge,
    "--phase-child-fill": light.childFill,
    "--phase-child-edge": light.childEdge,
    "--phase-ink": light.ink,
    "--phase-fill-dark": dark.fill,
    "--phase-child-fill-dark": dark.childFill,
    "--phase-ink-dark": dark.ink,
  } as CSSProperties
}

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => toLinear(parseInt(hex.slice(i, i + 2), 16) / 255)) as [
    number,
    number,
    number,
  ]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** El contraste WCAG entre dos colores, de 1 a 21. */
export function contrast(a: string, b: string) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (high + 0.05) / (low + 0.05)
}

/** Lo que lleva cualquier cosa pintada con el color de una fase: barra, marca o muestra. */
export interface PhaseTint {
  className: string
  style: CSSProperties
}

/** La fase lleva el relleno principal; subfases, procesos y acciones, el suave. */
export const phaseTint = (hex: string | null | undefined, isPhase: boolean): PhaseTint => ({
  className: isPhase ? "phase-fill phase-edge" : "phase-child-fill phase-child-edge",
  style: phaseVars(hex),
})
