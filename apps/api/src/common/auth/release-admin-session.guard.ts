import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PrismaService } from '../../database/prisma/prisma.service';
import type { AuthenticatedRequest } from './access-token.guard';
import { hasReleaseAdminRole } from './authorization.policy';
import { PUBLIC_ROUTE_KEY } from './public.decorator';

const unauthorized = (): UnauthorizedException =>
  new UnauthorizedException({
    code: 'UNAUTHORIZED',
    message: 'An active account session is required.',
    details: {},
  });

/**
 * Release-admin credentials are live authorizations, not durable JWT claims.
 * The later AuthorizationGuard still decides whether a route permits the
 * principal's role/permissions; this guard ensures an otherwise permitted
 * ADMIN has an active user and unrevoked, unexpired persisted session before
 * any administrative controller can run.
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

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const principal = request.auth;
    if (!principal) throw unauthorized();

    // The fixed Phase 11 boundary is intentionally narrow: the retained
    // PATIENT/DOCTOR/STAFF self-service paths keep their established session
    // semantics, while every ADMIN capability becomes immediately revocable.
    if (!hasReleaseAdminRole(principal.roles)) return true;

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
