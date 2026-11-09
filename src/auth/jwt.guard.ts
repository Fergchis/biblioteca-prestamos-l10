import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify } from 'jose';

/**
 * La identidad sale del token, no del cuerpo. Sin token valido, 401.
 *
 * Este servicio solo comprueba firma, `iss`, `exp` y `nbf` contra el JWKS del emisor: el gateway y el
 * BFF ya revisaron `token_use`, `client_id` y los grupos. Deja el `sub` en `req.sub`.
 */
@Injectable()
export class JwtGuard implements CanActivate {
  private readonly issuer: string;
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(config: ConfigService) {
    this.issuer = config.getOrThrow<string>('COGNITO_ISSUER');
    // Se baja el JWKS una vez y lo cachea. Si aparece un kid nuevo, lo vuelve a pedir solo.
    this.jwks = createRemoteJWKSet(new URL(`${this.issuer}/.well-known/jwks.json`));
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; sub?: string }>();
    const cabecera = req.headers.authorization;
    if (!cabecera?.startsWith('Bearer ')) throw new UnauthorizedException('falta un token valido');

    try {
      const { payload } = await jwtVerify(cabecera.slice(7), this.jwks, { issuer: this.issuer });
      if (!payload.sub) throw new Error('el token no trae sub');
      req.sub = payload.sub;
    } catch {
      throw new UnauthorizedException('falta un token valido');
    }
    return true;
  }
}
