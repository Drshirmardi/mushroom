import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PrismaService } from '../../database/prisma/prisma.service';
import type { AuthenticatedRequest } from './access-token.guard';
import { SKIP_ACTIVE_SESSION_CHECK_KEY } from './active-session.decorator';
import { PUBLIC_ROUTE_KEY } from './public.decorator';

const unauthorized = (): UnauthorizedException =>
  new UnauthorizedException({
    code: 'UNAUTHORIZED',
    message: 'An active account session is required.',
    details: {},
  });

/**
 * Access tokens are short lived credentials, but the underlying account and
 * session are live authorization state. This makes logout, password changes,
 * account disabling, and session revocation effective on the next request for
 * every role.
 */
@Injectable()
export class ReleaseAdminSessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      PUBLIC_ROUTE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) return true;

    const skipActiveSessionCheck = this.reflector.getAllAndOverride<boolean>(
      SKIP_ACTIVE_SESSION_CHECK_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skipActiveSessionCheck) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const principal = request.auth;
    if (!principal) throw unauthorized();

    const session = await this.prisma.session.findFirst({
      where: {
        id: principal.sessionId,
        userId: principal.userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        user: { status: 'ACTIVE' },
      },
      select: { id: true },
    });
    if (!session) throw unauthorized();

    return true;
  }
}
