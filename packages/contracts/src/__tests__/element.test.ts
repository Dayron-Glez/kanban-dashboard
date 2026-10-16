import { describe, expect, it } from "vitest"
import { CreateActionInputSchema, EditElementInputSchema } from "../element.js"

const meeting = { kind: "meeting", name: "Reunión de producción", startsOn: "2027-04-14" }
const failsAt = (input: object) =>
  CreateActionInputSchema.safeParse(input).error?.issues.map((issue) => issue.path.join("."))
const hours = (startTime: string, endTime: string | null, hoursMode: string | null = null) => ({
  allDay: false,
  startTime,
  endTime,
  hoursMode,
})

describe("crear una acción", () => {
  it("nace normal, de todo el día, sin hacer y sin videollamada", () => {
    expect(CreateActionInputSchema.parse(meeting)).toMatchObject({
      priority: "normal",
      hours: { allDay: true, startTime: null, endTime: null, hoursMode: null },
      location: null,
      notes: null,
      completed: false,
      videoApp: null,
      videoUrl: null,
    })
  })

  it("el título, de 1 a 120 caracteres", () => {
    expect(failsAt({ ...meeting, name: " " })).toEqual(["name"])
    expect(failsAt({ ...meeting, name: "a".repeat(121) })).toEqual(["name"])
  })

  it("con horas, las reglas del «Cuándo» según los días que dura", () => {
    expect(failsAt({ ...meeting, hours: hours("10:00", "11:00") })).toBeUndefined()
    expect(failsAt({ ...meeting, hours: hours("11:00", "10:00") })).toEqual(["hours.endTime"])
    const event = { ...meeting, kind: "event", endsOn: "2027-04-16" }
    expect(failsAt({ ...event, hours: hours("09:00", "14:00") })).toEqual(["hours.hoursMode"])
    expect(failsAt({ ...event, hours: hours("22:00", "06:00", "continuous") })).toBeUndefined()
    expect(failsAt({ ...event, hours: hours("22:00", "06:00", "daily") })).toEqual([
      "hours.endTime",
    ])
  })

  it("las horas sueltas se comprueban aunque falten las fechas", () => {
    expect(failsAt({ ...meeting, hours: { allDay: true, startTime: "10:00" } })).toEqual([
      "hours.startTime",
    ])
  })

  it("reuniones y recordatorios, de un día; la contratación, sin horas", () => {
    expect(failsAt({ ...meeting, endsOn: "2027-04-15" })).toEqual(["endsOn"])
    const hiring = { ...meeting, kind: "hiring", endsOn: null }
    expect(failsAt(hiring)).toBeUndefined()
    expect(failsAt({ ...hiring, hours: hours("09:00", "18:00") })).toEqual(["hours.allDay"])
  })

  it("solo una tarea se marca hecha, y solo una reunión lleva videollamada", () => {
    expect(failsAt({ ...meeting, completed: true })).toEqual(["completed"])
    expect(failsAt({ ...meeting, kind: "task", completed: true })).toBeUndefined()
    const call = { videoApp: "meet", videoUrl: "https://meet.google.com/abc-defg-hij" }
    expect(failsAt({ ...meeting, ...call })).toBeUndefined()
    expect(failsAt({ ...meeting, kind: "event", ...call })).toEqual(["videoApp"])
    expect(failsAt({ ...meeting, videoUrl: call.videoUrl })).toEqual(["videoUrl"])
  })

  it("el enlace de la videollamada, solo http o https", () => {
    expect(failsAt({ ...meeting, videoApp: "zoom", videoUrl: "ftp://zoom.us/j/1" })).toEqual([
      "videoUrl",
    ])
  })
})

describe("editar un elemento", () => {
  it("cada campo, por separado; las horas se comprueban sin las fechas", () => {
    expect(EditElementInputSchema.safeParse({ priority: "high" }).success).toBe(true)
    expect(EditElementInputSchema.safeParse({ location: "a".repeat(201) }).success).toBe(false)
    expect(EditElementInputSchema.safeParse({ hours: hours("10:00", null) }).success).toBe(true)
    expect(
      EditElementInputSchema.safeParse({ hours: hours("10:00", "09:00", "daily") }).success
    ).toBe(false)
  })
})
