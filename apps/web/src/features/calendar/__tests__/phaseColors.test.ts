import { buildCalendarTemplate } from "@repo/domain"
import { describe, expect, it } from "vitest"
import { contrast, hexToOklch, oklchToHex, PHASE_TEXT, phaseTones } from "../lib/phaseColors"

// Los fondos de los dos temas (tailwind.css): la página y las tarjetas.
const LIGHT = ["#f3f6fa", "#ffffff"]
const DARK = ["#0a1015", "#131a23"]

const phases = buildCalendarTemplate("film")
  .filter((element) => element.parentKey == null)
  .map((element) => [element.name, element.color!] as const)

describe("colores de fase", () => {
  it("la conversión a OKLCH y vuelta conserva el color", () => {
    for (const [, hex] of phases) expect(oklchToHex(hexToOklch(hex))).toBe(hex.toLowerCase())
  })

  it("el relleno es el mismo pastel en los dos temas, con el mismo tono que el color guardado", () => {
    for (const [, hex] of phases) {
      const { light, dark } = phaseTones(hex)
      expect(light.fill).toBe(dark.fill)
      expect(Math.abs(hexToOklch(light.fill)[2] - hexToOklch(hex)[2])).toBeLessThan(3)
    }
  })

  it.each(phases)("%s se distingue del fondo y su texto se lee, en los dos temas", (_, hex) => {
    const { light, dark } = phaseTones(hex)
    for (const background of LIGHT) {
      // En claro lo que separa la barra del fondo es su borde.
      expect(contrast(light.edge, background)).toBeGreaterThanOrEqual(3)
      expect(contrast(light.childEdge, background)).toBeGreaterThanOrEqual(3)
    }
    for (const background of DARK) {
      expect(contrast(dark.fill, background)).toBeGreaterThanOrEqual(3)
      expect(contrast(dark.childFill, background)).toBeGreaterThanOrEqual(3)
    }
    expect(contrast(PHASE_TEXT, light.fill)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(PHASE_TEXT, dark.fill)).toBeGreaterThanOrEqual(4.5)
  })
})
