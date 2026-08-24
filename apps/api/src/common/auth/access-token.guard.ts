import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';

import {
  AccessTokenService,
  type AccessTokenPrincipal,
} from './access-token.service';
import { PUBLIC_ROUTE_KEY } from './public.decorator';

export type AuthenticatedRequest = FastifyRequest & {
  auth: AccessTokenPrincipal;
};

const unauthorized = (): UnauthorizedException =>
  new UnauthorizedException({
    code: 'UNAUTHORIZED',
    message: 'Authentication required.',
    details: {},
  });

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessTokens: AccessTokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      PUBLIC_ROUTE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const authorization = request.headers.authorization;
    const match = typeof authorization === 'string'
      ? /^Bearer ([^\s,]+)$/i.exec(authorization)
      : null;

    if (!match?.[1]) throw unauthorized();

    try {
      const principal = await this.accessTokens.verify(match[1]);
      (request as AuthenticatedRequest).auth = principal;

      return true;
    } catch {
      throw unauthorized();
    }
  }
}
