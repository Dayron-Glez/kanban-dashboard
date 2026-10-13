import { describe, expect, it } from "vitest"
import { fromIsoDate, toIsoDate } from "../planDates"
import {
  dayGridRange,
  gridDays,
  monthSegments,
  monthTicks,
  mondayOf,
  positionOf,
  spanOf,
  timelineRange,
  weekNumber,
  weekSegments,
} from "../timelineLayout"

const d = fromIsoDate

describe("mondayOf", () => {
  it("lleva cualquier día al lunes de su semana", () => {
    expect(toIsoDate(mondayOf(d("2027-04-05")))).toBe("2027-04-05")
    expect(toIsoDate(mondayOf(d("2027-04-11")))).toBe("2027-04-05")
    expect(toIsoDate(mondayOf(d("2027-05-02")))).toBe("2027-04-26")
    expect(toIsoDate(mondayOf(d("1970-01-01")))).toBe("1969-12-29")
  })
})

describe("weekNumber, como en el prototipo", () => {
  const week1 = d("2027-04-05")

  it("1 la del rodaje, y siguen 2, 3…", () => {
    expect(weekNumber(week1, week1)).toBe(1)
    expect(weekNumber(d("2027-04-08"), week1)).toBe(1)
    expect(weekNumber(week1 + 7, week1)).toBe(2)
    expect(weekNumber(week1 + 70, week1)).toBe(11)
  })

  it("antes del rodaje, −1, −2…, sin semana 0", () => {
    expect(weekNumber(week1 - 1, week1)).toBe(-1)
    expect(weekNumber(week1 - 7, week1)).toBe(-1)
    expect(weekNumber(week1 - 14, week1)).toBe(-2)
  })
})

describe("timelineRange", () => {
  it("va de lo primero a lo último, con margen", () => {
    const range = timelineRange(
      [
        { start: d("2026-01-01"), end: d("2026-03-31") },
        { start: d("2027-11-01"), end: null },
        { start: null, end: null },
      ],
      7
    )!
    expect(toIsoDate(range.start)).toBe("2025-12-25")
    expect(toIsoDate(range.end)).toBe("2027-11-08")
    expect(range.days).toBe(range.end - range.start + 1)
  })

  it("sin fechas, no hay cronograma", () => {
    expect(timelineRange([{ start: null, end: null }])).toBeNull()
  })
})

describe("positionOf y spanOf", () => {
  const range = { start: d("2027-01-01"), end: d("2027-01-10"), days: 10 }

  it("el primer día está en 0 y un día ocupa una décima", () => {
    expect(positionOf(d("2027-01-01"), range)).toBe(0)
    expect(positionOf(d("2027-01-06"), range)).toBe(0.5)
    expect(spanOf(d("2027-01-01"), d("2027-01-01"), range)).toBe(0.1)
    expect(
      positionOf(d("2027-01-10"), range) + spanOf(d("2027-01-10"), d("2027-01-10"), range)
    ).toBe(1)
  })
})

describe("monthTicks", () => {
  it("el primer día de cada mes dentro del cronograma", () => {
    const range = timelineRange([{ start: d("2026-11-15"), end: d("2027-02-10") }], 0)!
    expect(monthTicks(range).map((tick) => [toIsoDate(tick.day), tick.month, tick.year])).toEqual([
      ["2026-12-01", 11, 2026],
      ["2027-01-01", 0, 2027],
      ["2027-02-01", 1, 2027],
    ])
  })
})

describe("dayGridRange", () => {
  const plan = [
    { start: d("2026-01-01"), end: d("2026-03-31") },
    { start: d("2027-04-05"), end: d("2027-10-31") },
  ]

  it("va del lunes de la primera semana a 14 días después del final", () => {
    const range = dayGridRange(plan)!
    // El 1 de enero de 2026 fue jueves: la rejilla empieza el lunes 29 de diciembre.
    expect(toIsoDate(range.start)).toBe("2025-12-29")
    expect(toIsoDate(range.end)).toBe("2027-11-14")
    expect(range.days).toBe(range.end - range.start + 1)
  })

  it("abarca hoy aunque el plan no lo toque, para poder centrarse en él", () => {
    const range = dayGridRange(
      [{ start: d("2027-04-05"), end: d("2027-05-16") }],
      [d("2026-10-13")]
    )!
    expect(toIsoDate(range.start)).toBe("2026-10-12")
    expect(toIsoDate(range.end)).toBe("2027-05-30")
  })

  it("sin fechas, no hay rejilla", () => {
    expect(dayGridRange([{ start: null, end: null }], [d("2026-10-13")])).toBeNull()
  })
})

describe("gridDays", () => {
  it("cada día con su día de la semana, de lunes (0) a domingo (6)", () => {
    const days = gridDays({ start: d("2026-01-01"), end: d("2026-01-05"), days: 5 })
    expect(days.map(({ weekday, weekend, dayOfMonth }) => [dayOfMonth, weekday, weekend])).toEqual([
      [1, 3, false],
      [2, 4, false],
      [3, 5, true],
      [4, 6, true],
      [5, 0, false],
    ])
  })
})

describe("monthSegments", () => {
  it("los meses recortados a la rejilla, el primero a medias", () => {
    const range = { start: d("2025-12-29"), end: d("2026-02-10"), days: 44 }
    expect(
      monthSegments(range).map(({ start, days, month, year }) => [
        toIsoDate(start),
        days,
        month,
        year,
      ])
    ).toEqual([
      ["2025-12-29", 3, 11, 2025],
      ["2026-01-01", 31, 0, 2026],
      ["2026-02-01", 10, 1, 2026],
    ])
  })
})

describe("weekSegments", () => {
  it("semanas de lunes a domingo numeradas desde la del rodaje, sin semana 0", () => {
    const range = { start: d("2027-03-22"), end: d("2027-04-14"), days: 24 }
    expect(
      weekSegments(range, d("2027-04-05")).map(({ start, days, number }) => [
        toIsoDate(start),
        days,
        number,
      ])
    ).toEqual([
      ["2027-03-22", 7, -2],
      ["2027-03-29", 7, -1],
      ["2027-04-05", 7, 1],
      ["2027-04-12", 3, 2],
    ])
  })

  it("sin rodaje con fecha, las semanas no llevan número", () => {
    const range = { start: d("2027-03-22"), end: d("2027-03-28"), days: 7 }
    expect(weekSegments(range, null)).toEqual([{ start: d("2027-03-22"), days: 7, number: null }])
  })
})
