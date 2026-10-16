import { CreateActionInputSchema } from "@repo/contracts"
import * as z from "zod"
import { describe, expect, it } from "vitest"

const messages = (schema: z.ZodType, input: unknown) =>
  Object.fromEntries(
    schema.safeParse(input).error?.issues.map((issue) => [issue.path.join("."), issue.message]) ??
      []
  )

const meeting = { kind: "meeting", name: "Reunión", startsOn: "2027-04-14" }

describe("los mensajes de los formularios", () => {
  it("en lenguaje normal, para lo de siempre", () => {
    expect(
      messages(z.object({ name: z.string().trim().min(1).max(5), url: z.url() }), {
        name: " ",
        url: "nope",
      })
    ).toEqual({
      name: "Hace falta rellenarlo",
      url: "Tiene que ser un enlace que empiece por https://",
    })
    expect(messages(z.object({ name: z.string().max(5) }), { name: "abcdefg" })).toEqual({
      name: "Como mucho 5 caracteres",
    })
  })

  it("las reglas propias de las acciones, cada una con el suyo", () => {
    expect(
      messages(CreateActionInputSchema, {
        ...meeting,
        hours: { allDay: false, startTime: "11:00", endTime: "10:00" },
        completed: true,
        videoUrl: "https://meet.google.com/abc",
      })
    ).toEqual({
      "hours.endTime": "La hora de fin tiene que ser posterior a la de inicio",
      completed: "Solo las tareas se marcan como hechas",
      videoUrl: "Elige antes la app de la videollamada",
    })
  })

  it("lo que no está en el mapa, en el español de Zod", () => {
    expect(messages(z.object({ kind: z.enum(["a"]) }), { kind: "b" }).kind).toMatch(/inválid/i)
  })

  it("el mensaje escrito en un esquema manda sobre el mapa", () => {
    expect(messages(z.object({ name: z.string().min(5, "Mínimo cinco") }), { name: "a" })).toEqual({
      name: "Mínimo cinco",
    })
  })
})
