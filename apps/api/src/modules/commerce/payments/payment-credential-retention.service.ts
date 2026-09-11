import { Injectable } from '@nestjs/common';
import { CredentialVersionStatus, PaymentAttemptStatus, Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { CommerceClock } from '../inventory/commerce-clock';

const RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
const terminalAttempts = [PaymentAttemptStatus.VERIFIED, PaymentAttemptStatus.FAILED, PaymentAttemptStatus.EXPIRED, PaymentAttemptStatus.CANCELLED];

/** Removes decryptable material only from retired revisions with no active/reconciling dependency. */
@Injectable()
export class PaymentCredentialRetentionService {
  constructor(private readonly prisma: PrismaService, private readonly clock: CommerceClock) {}

  async shredDue(limit = 25) {
    const now = this.clock.now();
    const cutoff = new Date(now.getTime() - RETENTION_MS);
    return this.prisma.$transaction(async (tx) => {
      const candidates = await tx.paymentProviderCredentialVersion.findMany({
        where: { status: CredentialVersionStatus.RETIRED, createdAt: { lte: cutoff }, revisions: { every: { activeForConfigs: { none: {} }, paymentAttempts: { every: { status: { in: terminalAttempts } } } } } },
        orderBy: { createdAt: 'asc' }, take: limit, select: { id: true },
      });
      let shredded = 0;
      for (const candidate of candidates) {
        const updated = await tx.paymentProviderCredentialVersion.updateMany({
          where: { id: candidate.id, status: CredentialVersionStatus.RETIRED },
          data: { status: CredentialVersionStatus.CRYPTO_SHREDDED, encryptedPayload: null, encryptionNonce: null, authenticationTag: null, encryptionKeyVersion: null, cryptoShreddedAt: now },
        });
        shredded += updated.count;
      }
      return shredded;
    });
  }
}
