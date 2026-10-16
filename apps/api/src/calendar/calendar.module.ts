import { Module } from "@nestjs/common"
import { ProjectsModule } from "../projects/projects.module.js"
import { AlertReviewsController } from "./alert-reviews.controller.js"
import { AlertReviewsService } from "./alert-reviews.service.js"
import { ElementsController } from "./elements.controller.js"
import { ElementsService } from "./elements.service.js"
import { PlanController } from "./plan.controller.js"
import { PlanService } from "./plan.service.js"

@Module({
  imports: [ProjectsModule],
  controllers: [ElementsController, PlanController, AlertReviewsController],
  providers: [ElementsService, PlanService, AlertReviewsService],
})
export class CalendarModule {}
