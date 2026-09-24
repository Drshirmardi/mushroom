import { Injectable } from '@nestjs/common';

import { SessionRevocationReason } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';

type UserSocketInvalidator = {
  disconnectUser(userId: string): void;
};

/**
 * The sole server-side deactivation boundary. It durably disables the user and
 * revokes active sessions before evicting this single instance's chat sockets.
 */
@Injectable()
export class ManageUserStatusUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sockets: UserSocketInvalidator,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async disable(userId: string): Promise<boolean> {
    const disabled = await this.prisma.$transaction(async (transaction) => {
      const changed = await transaction.user.updateMany({
        where: { id: userId, status: 'ACTIVE' },
        data: { status: 'DISABLED' },
      });
      if (changed.count === 0) return false;

      await transaction.session.updateMany({
        where: { userId, revokedAt: null },
        data: {
          revokedAt: this.now(),
          revokedReason: SessionRevocationReason.ADMIN_REVOKED,
        },
      });
      return true;
    });

    if (disabled) this.sockets.disconnectUser(userId);
    return disabled;
  }
}
