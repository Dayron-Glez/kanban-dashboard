import { Controller, Get } from "@nestjs/common"
import { CurrentUser } from "../auth/current-user.decorator.js"
import type { AuthUser } from "../auth/token-verifier.js"

@Controller("me")
export class MeController {
  @Get()
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user
  }
}
