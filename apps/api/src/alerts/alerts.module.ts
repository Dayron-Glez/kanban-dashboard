import { Module } from "@nestjs/common"
import { ProjectsModule } from "../projects/projects.module.js"
import { AlertsController } from "./alerts.controller.js"
import { AlertsService } from "./alerts.service.js"

@Module({
  imports: [ProjectsModule],
  controllers: [AlertsController],
  providers: [AlertsService],
})
export class AlertsModule {}
