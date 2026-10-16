import { describe, expect, it } from "vitest"
import { CreateAlertInputSchema, UpdateAlertInputSchema } from "../alert.js"

const department = "0199f0a0-0000-7000-8000-000000000001"
const person = "0199f0a0-0000-7000-8000-000000000002"
const strike = {
  title: "Huelga de transporte",
  cause: "strike",
  scope: "project",
  when: { startsOn: "2026-10-16", endsOn: "2026-10-18" },
}
const failsAt = (schema: typeof UpdateAlertInputSchema, input: object) =>
  schema.safeParse(input).error?.issues.map((issue) => issue.path.join("."))

describe("crear una alerta", () => {
  it("segura, sin destinos ni notas por defecto", () => {
    expect(CreateAlertInputSchema.parse(strike)).toMatchObject({
      certainty: "confirmed",
      departmentIds: [],
      crewMemberIds: [],
      notes: null,
    })
  })

  it("de todo el proyecto, sin destinos; de personas y departamentos, con alguno", () => {
    const create = (input: object) => CreateAlertInputSchema.safeParse(input).success
    expect(create({ ...strike, departmentIds: [department] })).toBe(false)
    expect(create({ ...strike, scope: "targeted" })).toBe(false)
    expect(create({ ...strike, scope: "targeted", crewMemberIds: [person] })).toBe(true)
    expect(
      create({ ...strike, scope: "targeted", departmentIds: [department], crewMemberIds: [person] })
    ).toBe(true)
  })

  it("sin destinos repetidos", () => {
    expect(
      CreateAlertInputSchema.safeParse({
        ...strike,
        scope: "targeted",
        departmentIds: [department, department],
      }).error?.issues.map((issue) => issue.path.join("."))
    ).toEqual(["departmentIds"])
  })

  it("con un título de hasta 120 caracteres", () => {
    expect(CreateAlertInputSchema.safeParse({ ...strike, title: "  " }).success).toBe(false)
    expect(CreateAlertInputSchema.safeParse({ ...strike, title: "a".repeat(121) }).success).toBe(
      false
    )
  })
})

describe("editar una alerta", () => {
  it("cambia lo que llega, sin rellenar lo demás", () => {
    expect(UpdateAlertInputSchema.parse({ certainty: "possible" })).toEqual({
      certainty: "possible",
    })
  })

  it("el alcance va entero, con sus destinos", () => {
    expect(failsAt(UpdateAlertInputSchema, { departmentIds: [department] })).toEqual(["scope"])
    expect(failsAt(UpdateAlertInputSchema, { scope: "targeted" })).toEqual(["scope"])
    expect(UpdateAlertInputSchema.safeParse({ scope: "project" }).success).toBe(true)
  })

  it("no vale vacía", () => {
    expect(UpdateAlertInputSchema.safeParse({}).success).toBe(false)
  })
})
