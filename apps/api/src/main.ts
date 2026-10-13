import "reflect-metadata"
import { NestFactory } from "@nestjs/core"
import type { NestExpressApplication } from "@nestjs/platform-express"
import { Logger } from "nestjs-pino"
import { AppModule } from "./app.module.js"
import { ENV, type Env } from "./config/env.js"
import { configureApp } from "./configure-app.js"

const app = await NestFactory.create<NestExpressApplication>(AppModule, {
  bodyParser: false,
  bufferLogs: true,
})
app.useLogger(app.get(Logger))
const env = app.get<Env>(ENV)

configureApp(app)
// Cierra las conexiones a la base al apagar: Railway manda SIGTERM en cada despliegue.
app.enableShutdownHooks()

// 0.0.0.0 y no localhost: dentro del contenedor de Railway, localhost no es
// accesible desde fuera.
await app.listen(env.PORT, "0.0.0.0")
