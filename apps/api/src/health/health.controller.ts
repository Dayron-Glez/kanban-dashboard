import { Controller, Get, Inject, ServiceUnavailableException } from "@nestjs/common"
import { sql } from "drizzle-orm"
import { DB, type Database } from "../db/db.module.js"

export interface HealthStatus {
  status: "ok"
  database: "ok"
}

// Railway llama aquí antes de dar por bueno un despliegue y mientras corre:
// si la base no responde, devuelve 503 y la versión nueva no entra en servicio.
@Controller("health")
export class HealthController {
  constructor(@Inject(DB) private readonly db: Database) {}

  @Get()
  async check(): Promise<HealthStatus> {
    try {
      await this.db.execute(sql`select 1`)
    } catch {
      throw new ServiceUnavailableException({ status: "error", database: "unreachable" })
    }
    return { status: "ok", database: "ok" }
  }
}
