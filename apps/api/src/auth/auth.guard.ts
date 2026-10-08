import {
  Inject,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import type { Request } from "express"
import { IS_PUBLIC } from "./public.decorator.js"
import { SESSION_RESOLVER, type AuthUser, type SessionResolver } from "./session.js"

export type AuthenticatedRequest = Request & { user: AuthUser }

// Global: una ruta nueva nace protegida. Abrirla exige marcarla con @Public().
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(SESSION_RESOLVER) private readonly resolveSession: SessionResolver
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const user = await this.resolveSession(request.headers)
    if (!user) throw new UnauthorizedException("No hay ninguna sesión iniciada")
    request.user = user
    return true
  }
}
