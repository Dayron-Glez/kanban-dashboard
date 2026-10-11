import { Module } from "@nestjs/common"
import { ProjectsModule } from "../projects/projects.module.js"
import { ElementsController } from "./elements.controller.js"
import { ElementsService } from "./elements.service.js"

@Module({
  imports: [ProjectsModule],
  controllers: [ElementsController],
  providers: [ElementsService],
})
export class CalendarModule {}
