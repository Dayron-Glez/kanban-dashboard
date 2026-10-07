import { Module, StandardSchemaValidationPipe } from "@nestjs/common"
import { APP_PIPE } from "@nestjs/core"
import { AuthModule } from "./auth/auth.module.js"
import { BoardModule } from "./board/board.module.js"
import { ConfigModule } from "./config/config.module.js"
import { DbModule } from "./db/db.module.js"
import { HealthController } from "./health/health.controller.js"
import { MeController } from "./me/me.controller.js"
import { ProjectsModule } from "./projects/projects.module.js"

@Module({
  imports: [ConfigModule, DbModule, AuthModule, ProjectsModule, BoardModule],
  controllers: [HealthController, MeController],
  // Valida cada @Body({ schema }) con los esquemas Zod de @repo/contracts.
  providers: [{ provide: APP_PIPE, useClass: StandardSchemaValidationPipe }],
})
export class AppModule {}
