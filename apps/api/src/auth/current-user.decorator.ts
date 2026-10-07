import { createParamDecorator, type ExecutionContext } from "@nestjs/common"
import type { AuthenticatedRequest } from "./auth.guard.js"

/** El usuario de la sesión. Solo en rutas protegidas: lo deja ahí el AuthGuard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user
)
