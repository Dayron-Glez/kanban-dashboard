import { randomUUID } from "node:crypto"
import { Module } from "@nestjs/common"
import { LoggerModule as PinoModule, type Params } from "nestjs-pino"
import { ENV, type Env } from "../config/env.js"
import { prettyStream } from "./pretty.js"

type HttpOptions = Exclude<Params["pinoHttp"], unknown[] | undefined>

// En local, líneas legibles con pino-pretty; en Railway, una línea JSON por evento.
@Module({
  imports: [
    PinoModule.forRootAsync({
      inject: [ENV],
      useFactory: async (env: Env): Promise<Params> => {
        const options: HttpOptions = {
          level: env.LOG_LEVEL ?? (env.NODE_ENV === "test" ? "silent" : "info"),
          genReqId: (request, response) => {
            const id = request.headers["x-request-id"] ?? randomUUID()
            response.setHeader("x-request-id", id)
            return id
          },
          autoLogging: { ignore: (request) => request.url === "/health" },
          // Las lecturas que salen bien van a debug: la web las repite al recuperar el foco.
          customLogLevel: (request, response, error) => {
            if (error || response.statusCode >= 500) {
              return "error"
            }

            if (response.statusCode >= 400) {
              return "warn"
            }

            return request.method === "GET" ? "debug" : "info"
          },
          customSuccessMessage: (request, response, responseTime) =>
            `${request.method} ${request.url} → ${response.statusCode} (${responseTime} ms)`,
          customErrorMessage: (request, response, error) =>
            `${request.method} ${request.url} → ${response.statusCode}: ${error.message}`,

          serializers: {
            req: (request: { id: string; method: string; url: string }) => ({
              id: request.id,
              method: request.method,
              url: request.url,
            }),
            res: (response: { statusCode: number }) => ({ statusCode: response.statusCode }),
          },
        }
        return {
          pinoHttp: env.NODE_ENV === "development" ? [options, await prettyStream()] : options,
        }
      },
    }),
  ],
})
export class LoggerModule {}
