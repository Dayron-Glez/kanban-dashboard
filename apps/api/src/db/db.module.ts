import { Global, Inject, Module, type OnApplicationShutdown } from "@nestjs/common"
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js"
import postgres, { type Sql } from "postgres"
import { ENV, type Env } from "../config/env.js"
import * as schema from "./schema/index.js"

export type Database = PostgresJsDatabase<typeof schema>

export const DB = Symbol("DB")
const SQL = Symbol("SQL")

@Global()
@Module({
  providers: [
    {
      provide: SQL,
      inject: [ENV],
      // prepare: false porque el pooler de Neon (PgBouncer en modo transacción)
      // puede mandar cada consulta a otra conexión, sin la sentencia preparada.
      useFactory: (env: Env) => postgres(env.DATABASE_URL, { prepare: false, max: 10 }),
    },
    {
      provide: DB,
      inject: [SQL],
      useFactory: (sql: Sql) => drizzle(sql, { schema }),
    },
  ],
  exports: [DB],
})
export class DbModule implements OnApplicationShutdown {
  constructor(@Inject(SQL) private readonly sql: Sql) {}

  async onApplicationShutdown(): Promise<void> {
    await this.sql.end({ timeout: 5 })
  }
}
