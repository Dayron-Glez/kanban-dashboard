import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
} from "@nestjs/common"
import {
  CreateInvitationInputSchema,
  type AcceptedInvitation,
  type Invitation,
  type InvitationPreview,
} from "@repo/contracts"
import { CurrentUser } from "../auth/current-user.decorator.js"
import type { AuthUser } from "../auth/session.js"
import { InvitationsService } from "./invitations.service.js"

// El proyecto va en la ruta, no en el cuerpo.
const CreateInvitationBodySchema = CreateInvitationInputSchema.omit({ projectId: true })

@Controller()
export class InvitationsController {
  constructor(@Inject(InvitationsService) private readonly invitations: InvitationsService) {}

  @Get("projects/:projectId/invitations")
  listPending(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string
  ): Promise<Invitation[]> {
    return this.invitations.listPending(user.id, projectId)
  }

  @Post("projects/:projectId/invitations")
  create(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Body({ schema: CreateInvitationBodySchema }) { email }: { email: string }
  ): Promise<Invitation> {
    return this.invitations.create(user.id, projectId, email)
  }

  @Delete("invitations/:invitationId")
  @HttpCode(204)
  cancel(
    @CurrentUser() user: AuthUser,
    @Param("invitationId", ParseUUIDPipe) invitationId: string
  ): Promise<void> {
    return this.invitations.cancel(user.id, invitationId)
  }

  @Get("invitations/token/:token")
  findByToken(@Param("token", ParseUUIDPipe) token: string): Promise<InvitationPreview> {
    return this.invitations.findByToken(token)
  }

  @Post("invitations/token/:token/accept")
  @HttpCode(200)
  accept(
    @CurrentUser() user: AuthUser,
    @Param("token", ParseUUIDPipe) token: string
  ): Promise<AcceptedInvitation> {
    return this.invitations.accept(user.id, token)
  }
}
