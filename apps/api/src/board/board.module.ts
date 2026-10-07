import { Module } from "@nestjs/common"
import { ProjectsModule } from "../projects/projects.module.js"
import { ColumnsController } from "./columns.controller.js"
import { ColumnsService } from "./columns.service.js"
import { HistoryService } from "./history.service.js"
import { TasksController } from "./tasks.controller.js"
import { TasksService } from "./tasks.service.js"

@Module({
  imports: [ProjectsModule],
  controllers: [ColumnsController, TasksController],
  providers: [ColumnsService, TasksService, HistoryService],
})
export class BoardModule {}
