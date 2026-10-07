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
import {
  InvalidTokenError,
  TOKEN_VERIFIER,
  type AuthUser,
  type TokenVerifier,
} from "./token-verifier.js"

export type AuthenticatedRequest = Request & { user: AuthUser }

const bearerToken = (request: Request): string | null => {
  const [scheme, token] = request.headers.authorization?.split(" ") ?? []
  return scheme?.toLowerCase() === "bearer" && token ? token : null
}

// Global: una ruta nueva nace protegida. Abrirla exige marcarla con @Public().
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(TOKEN_VERIFIER) private readonly verify: TokenVerifier
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const token = bearerToken(request)
    if (!token) throw new UnauthorizedException("Falta el token de sesión")

    try {
      request.user = await this.verify(token)
    } catch (error) {
      if (error instanceof InvalidTokenError) throw new UnauthorizedException(error.message)
      throw error
    }
    return true
  }
}
