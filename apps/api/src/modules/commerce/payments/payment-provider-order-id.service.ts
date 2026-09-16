import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';

const exhausted = () => new ServiceUnavailableException({ code: 'PAYMENT_PROVIDER_CONFIGURATION_INVALID', message: 'Payment provider order-id allocation is unavailable.', details: {} });

@Injectable()
export class PaymentProviderOrderIdService {
  async next(tx: Prisma.TransactionClient) {
    const rows = await tx.$queryRaw<Array<{ value: bigint }>>(Prisma.sql`SELECT nextval('payment_provider_order_id_seq') AS value`);
    const value = rows[0]?.value;
    if (!value || value <= 0n) throw exhausted();
    return value;
  }
}
