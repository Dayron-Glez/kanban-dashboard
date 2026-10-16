import { describe, expect, it } from "vitest"
import { CreateActionInputSchema } from "../element.js"
import { PeopleInputSchema } from "../people.js"

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`
const failsAt = (input: object) =>
  PeopleInputSchema.safeParse(input).error?.issues.map((issue) => issue.path.join("."))

describe("las personas de una acción", () => {
  it("sin indicarlo, nadie", () => {
    expect(PeopleInputSchema.parse({})).toEqual({
      responsibleId: null,
      executorIds: [],
      departmentIds: [],
      guests: [],
    })
  })

  it("cada persona, un solo papel, y sin departamentos repetidos", () => {
    expect(failsAt({ responsibleId: id(1), executorIds: [id(1)] })).toEqual(["executorIds"])
    expect(failsAt({ executorIds: [id(1), id(1)] })).toEqual(["executorIds"])
    expect(failsAt({ departmentIds: [id(2), id(2)] })).toEqual(["departmentIds"])
  })

  it("un participante es del equipo, o de fuera con nombre y email", () => {
    expect(failsAt({ guests: [{ crewMemberId: id(1) }] })).toBeUndefined()
    expect(failsAt({ guests: [{ fullName: "José", email: "jose@x.es" }] })).toBeUndefined()
    expect(failsAt({ guests: [{ fullName: "José" }] })).toEqual(["guests.0.email"])
    expect(failsAt({ guests: [{ crewMemberId: id(1), fullName: "José" }] })).toEqual([
      "guests.0.crewMemberId",
    ])
    expect(failsAt({ guests: [{ fullName: "José", email: "no-es-un-email" }] })).toEqual([
      "guests.0.email",
    ])
  })

  it("sin participantes repetidos, tampoco por el email con otras mayúsculas", () => {
    expect(
      failsAt({
        guests: [
          { fullName: "A", email: "a@x.es" },
          { fullName: "B", email: "A@X.es" },
        ],
      })
    ).toEqual(["guests"])
  })

  it("el viaje y la contratación no llevan estas personas", () => {
    const travel = { kind: "travel", name: "Viaje", startsOn: "2027-04-14" }
    const fails = CreateActionInputSchema.safeParse({
      ...travel,
      people: { responsibleId: id(1) },
    }).error?.issues.map((issue) => issue.path.join("."))
    expect(fails).toEqual(["people"])
    expect(CreateActionInputSchema.safeParse(travel).success).toBe(true)
  })
})
