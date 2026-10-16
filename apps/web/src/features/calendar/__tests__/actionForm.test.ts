import { describe, expect, it } from "vitest"
import { newActionValues, previewElement, switchKind } from "../forms/actionForm"

const request = { parentId: "rodaje", startsOn: "2027-04-14", endsOn: "2027-04-16" }

describe("el formulario de una acción nueva", () => {
  it("nace con lo de la celda y los valores de su tipo; reunión y recordatorio, de un día", () => {
    expect(newActionValues({ ...request, kind: "task" })).toMatchObject({
      kind: "task",
      name: "",
      startsOn: "2027-04-14",
      endsOn: "2027-04-16",
      hours: { allDay: true },
    })
    expect(newActionValues({ ...request, kind: "meeting" })).toMatchObject({
      endsOn: null,
      hours: { allDay: false, startTime: "10:00", endTime: "11:00" },
    })
  })

  it("al cambiar de tipo, las horas de serie siguen al tipo; las tocadas se quedan", () => {
    const task = newActionValues({ ...request, endsOn: null, kind: "task" })
    expect(switchKind(task, "meeting").hours).toEqual({
      allDay: false,
      startTime: "10:00",
      endTime: "11:00",
      hoursMode: null,
    })
    const touched = {
      ...task,
      hours: { allDay: false, startTime: "08:00", endTime: "09:00", hoursMode: null },
    }
    expect(switchKind(touched, "meeting").hours).toBeUndefined()
    expect(switchKind(touched, "hiring").hours).toEqual({
      allDay: true,
      startTime: null,
      endTime: null,
      hoursMode: null,
    })
  })

  it("fuera lo que el nuevo tipo no tiene: un solo día, «hecha» y la videollamada", () => {
    const task = { ...newActionValues({ ...request, kind: "task" }), completed: true }
    expect(switchKind(task, "reminder")).toMatchObject({ endsOn: null, completed: false })
    const meeting = {
      ...newActionValues({ ...request, kind: "meeting" }),
      videoApp: "zoom" as const,
      videoUrl: "https://zoom.us/j/1",
    }
    expect(switchKind(meeting, "event")).toMatchObject({ videoApp: null, videoUrl: null })
  })

  it("se pinta con su nombre, o el de serie, y lo que dura", () => {
    const values = newActionValues({ ...request, kind: "task" })
    expect(previewElement(values, "p")).toMatchObject({
      name: "Nueva tarea",
      parentId: "rodaje",
      duration: { amount: 3, unit: "days" },
      isPinned: true,
    })
    expect(previewElement({ ...values, name: " Ensayos " }, "p").name).toBe("Ensayos")
  })
})
