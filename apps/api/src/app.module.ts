import { Module } from "@nestjs/common"
import { AuthModule } from "./auth/auth.module.js"
import { ConfigModule } from "./config/config.module.js"
import { DbModule } from "./db/db.module.js"
import { HealthController } from "./health/health.controller.js"
import { MeController } from "./me/me.controller.js"

@Module({
  imports: [ConfigModule, DbModule, AuthModule],
  controllers: [HealthController, MeController],
})
export class AppModule {}
