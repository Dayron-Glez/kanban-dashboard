import { Module } from "@nestjs/common"
import { CrewController } from "./crew.controller.js"
import { CrewService } from "./crew.service.js"
import { DepartmentsController } from "./departments.controller.js"
import { DepartmentsService } from "./departments.service.js"
import { InvitationsController } from "./invitations.controller.js"
import { InvitationsService } from "./invitations.service.js"
import { MembersController } from "./members.controller.js"
import { MembersService } from "./members.service.js"
import { ProjectAccess } from "./project-access.js"
import { ProjectsController } from "./projects.controller.js"
import { ProjectsService } from "./projects.service.js"

@Module({
  controllers: [
    ProjectsController,
    MembersController,
    InvitationsController,
    DepartmentsController,
    CrewController,
  ],
  providers: [
    ProjectAccess,
    ProjectsService,
    MembersService,
    InvitationsService,
    DepartmentsService,
    CrewService,
  ],
  // El tablero comprueba el acceso con las mismas reglas.
  exports: [ProjectAccess],
})
export class ProjectsModule {}
