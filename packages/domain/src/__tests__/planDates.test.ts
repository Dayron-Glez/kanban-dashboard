import { describe, expect, it } from "vitest"
import {
  addMonths,
  endFromStart,
  fromIsoDate,
  isValidIsoDate,
  shiftDay,
  startFromEnd,
  toIsoDate,
} from "../planDates"

const d = fromIsoDate
const iso = toIsoDate

describe("fechas como días enteros", () => {
  it("ida y vuelta entre YYYY-MM-DD y el entero", () => {
    for (const value of ["1970-01-01", "2026-12-14", "2027-02-28", "2028-02-29", "2027-10-31"]) {
      expect(iso(d(value))).toBe(value)
    }
    expect(d("1970-01-02")).toBe(1)
  })

  it("rechaza fechas que no existen o con otro formato", () => {
    expect(isValidIsoDate("2027-02-29")).toBe(false)
    expect(isValidIsoDate("2028-02-29")).toBe(true)
    expect(isValidIsoDate("05/04/2027")).toBe(false)
    expect(isValidIsoDate(null)).toBe(false)
    expect(() => d("2027-02-30")).toThrow()
  })
})

describe("addMonths, como EDATE", () => {
  it("mismo día del mes, o el último si no existe", () => {
    expect(iso(addMonths(d("2027-01-31"), 1))).toBe("2027-02-28")
    expect(iso(addMonths(d("2028-01-31"), 1))).toBe("2028-02-29")
    expect(iso(addMonths(d("2027-04-05"), 2))).toBe("2027-06-05")
    expect(iso(addMonths(d("2027-01-25"), -2))).toBe("2026-11-25")
    expect(iso(addMonths(d("2027-03-31"), -1))).toBe("2027-02-28")
  })

  it("trunca los decimales: la fracción la resuelve shiftDay", () => {
    expect(iso(addMonths(d("2027-04-05"), 2.9))).toBe("2027-06-05")
  })
})

describe("shiftDay: desfases", () => {
  it("días y semanas, hacia delante y hacia atrás", () => {
    expect(iso(shiftDay(d("2027-05-16"), 1, "days"))).toBe("2027-05-17")
    expect(iso(shiftDay(d("2027-08-28"), -4, "weeks"))).toBe("2027-07-31")
    expect(shiftDay(d("2027-03-01"), 0, "months")).toBe(d("2027-03-01"))
  })

  it("los decimales se redondean hacia abajo", () => {
    expect(iso(shiftDay(d("2027-03-01"), 1.5, "days"))).toBe("2027-03-02")
    expect(iso(shiftDay(d("2027-03-01"), 0.5, "weeks"))).toBe("2027-03-04")
  })

  it("la fracción de mes se toma de los días del mes siguiente", () => {
    // 1 mes lleva al 1 de febrero; la mitad de febrero (28 días) son 14 más.
    expect(iso(shiftDay(d("2027-01-01"), 1.5, "months"))).toBe("2027-02-15")
  })
})

describe("endFromStart: el fin es el último día, incluido", () => {
  it("un día empieza y acaba el mismo día", () => {
    expect(iso(endFromStart(d("2027-09-01"), 1, "days"))).toBe("2027-09-01")
  })

  it("días, semanas y meses", () => {
    expect(iso(endFromStart(d("2027-09-01"), 3, "days"))).toBe("2027-09-03")
    expect(iso(endFromStart(d("2027-04-05"), 6, "weeks"))).toBe("2027-05-16")
    expect(iso(endFromStart(d("2026-01-01"), 3, "months"))).toBe("2026-03-31")
  })

  it("con decimales: 2,5 días son 2 y 2,5 semanas son 17", () => {
    expect(iso(endFromStart(d("2027-03-01"), 2.5, "days"))).toBe("2027-03-02")
    expect(iso(endFromStart(d("2027-08-15"), 2.5, "weeks"))).toBe("2027-08-31")
  })
})

describe("startFromEnd: contar hacia atrás", () => {
  it("termina el día antes de la referencia y la duración da el inicio", () => {
    // Preparación del proyecto de ejemplo: 9 semanas hasta el día antes del rodaje.
    expect(iso(startFromEnd(d("2027-04-04"), 9, "weeks"))).toBe("2027-02-01")
    expect(iso(startFromEnd(d("2027-01-24"), 2, "months"))).toBe("2026-11-25")
  })

  it("meses a final de mes, sin dejar hueco", () => {
    expect(iso(startFromEnd(d("2027-03-30"), 1, "months"))).toBe("2027-02-28")
  })

  it("meses con decimales: los 3,85 meses de SoftPre", () => {
    expect(iso(startFromEnd(d("2027-01-31"), 3.85, "months"))).toBe("2026-10-05")
  })

  it("es el inverso de endFromStart con duraciones enteras", () => {
    const start = d("2027-02-01")
    expect(startFromEnd(endFromStart(start, 9, "weeks"), 9, "weeks")).toBe(start)
    expect(startFromEnd(endFromStart(start, 5, "days"), 5, "days")).toBe(start)
  })
})
