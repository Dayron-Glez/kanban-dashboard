import type { DestinationStream } from "pino"

type RequestLog = { id: string; method: string; url: string }

// pino-pretty es de desarrollo: en la imagen de producción no está instalado.
export const prettyStream = async (): Promise<DestinationStream> => {
  const { default: pretty } = await import("pino-pretty")
  return pretty({
    translateTime: "SYS:HH:MM:ss",
    ignore: "pid,hostname,context,req,res,responseTime",
    messageFormat: (log, messageKey, _level, { colors }) => {
      const context = typeof log.context === "string" ? colors.yellow(`${log.context} `) : ""
      const request = log.req as RequestLog | undefined
      const requestId = request ? colors.gray(` #${request.id.slice(0, 8)}`) : ""
      return `${context}${String(log[messageKey])}${requestId}`
    },
  })
}
