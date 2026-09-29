import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { PrismaService } from '../../../database/prisma/prisma.service';

const unauthorized = (): UnauthorizedException => new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'An active account session is required.', details: {} });

/** Route-local enforcement; F11-T07 owns the future phase-wide shared guard. */
@Injectable()
export class AuditViewerSessionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const principal = request.auth;
    if (!principal) throw unauthorized();
    const session = await this.prisma.session.findFirst({
      where: { id: principal.sessionId, userId: principal.userId, revokedAt: null, expiresAt: { gt: new Date() }, user: { status: 'ACTIVE' } },
      select: { id: true },
    });
    if (!session) throw unauthorized();
    return true;
  }
}
