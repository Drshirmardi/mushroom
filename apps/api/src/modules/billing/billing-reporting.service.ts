import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { BillingService } from './billing.service';
import { financialForbidden } from './billing.policy';
import type { BillingAdminQuery, BillingPageQuery } from './billing.dto';

@Injectable()
export class BillingReportingService {
  constructor(private readonly prisma: PrismaService, private readonly billing: BillingService) {}
  async clinic(actorUserId: string) {
    const clinic = await this.prisma.clinic.findFirst({ where: { status: 'ACTIVE', clinicalClinicAccesses: { some: { userId: actorUserId } } }, orderBy: { id: 'asc' }, select: { id: true } });
    if (!clinic) throw financialForbidden();
    return clinic.id;
  }
  async intents(actor: string, query: BillingAdminQuery) {
    const clinicId = await this.clinic(actor);
    const where = { clinicId, ...(query.patientId ? { patientId: query.patientId } : {}), ...(query.purpose ? { purpose: query.purpose } : {}), ...(query.status ? { status: query.status } : {}) };
    const [total, rows] = await this.prisma.$transaction([this.prisma.billingIntent.count({ where }), this.prisma.billingIntent.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize })]);
    return { page: query.page, pageSize: query.pageSize, total, items: rows.map(row => ({ ...this.billing.view(row), patientId: row.patientId })) };
  }
  async reconciliation(actor: string, query: BillingPageQuery) {
    const clinicId = await this.clinic(actor);
    const where = { intent: { clinicId }, status: { in: ['CREATED', 'VERIFYING', 'REQUIRES_RECONCILIATION'] } };
    const [total, rows] = await this.prisma.$transaction([this.prisma.billingGatewayAttempt.count({ where }), this.prisma.billingGatewayAttempt.findMany({ where, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize, select: { id: true, intentId: true, providerOrderId: true, resultCode: true, status: true, amountRial: true, reference: true, traceNumber: true, verifiedAt: true, createdAt: true } })]);
    return { page: query.page, pageSize: query.pageSize, total, items: rows.map(row => ({ ...row, providerOrderId: row.providerOrderId.toString(), amountRial: row.amountRial.toString() })) };
  }
  async summary(actor: string) {
    const clinicId = await this.clinic(actor);
    return this.prisma.$transaction(async tx => {
      const intents = await tx.billingIntent.groupBy({ by: ['purpose'], where: { clinicId, status: 'PAID' }, _sum: { amountRial: true } });
      const liability = await tx.walletAccount.aggregate({ where: { clinicId, patientId: { not: null } }, _sum: { balanceRial: true } });
      const received = await tx.billingGatewayAttempt.aggregate({ where: { intent: { clinicId }, status: 'VERIFIED' }, _sum: { amountRial: true } });
      const topups = await tx.billingGatewayAttempt.aggregate({ where: { intent: { clinicId, purpose: 'TOPUP' }, status: 'VERIFIED' }, _sum: { amountRial: true } });
      const refunds = await tx.billingRefund.aggregate({ where: { intent: { clinicId }, status: 'COMPLETED' }, _sum: { amountRial: true } });
      const manual = await tx.walletJournal.groupBy({ by: ['kind'], where: { account: { clinicId }, kind: { in: ['ADMIN_CREDIT', 'ADMIN_DEBIT'] } }, _sum: { deltaRial: true } });
      const mismatch = await tx.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`SELECT count(*)::bigint AS count FROM wallet_accounts a WHERE a.clinic_id = ${clinicId}::uuid AND a.balance_rial <> COALESCE((SELECT sum(e.delta_rial) FROM wallet_entries e WHERE e.account_id = a.id), 0)`);
      const byPurpose = (purpose: string) => (intents.find(row => row.purpose === purpose)?._sum.amountRial ?? 0n).toString();
      return { currency: 'IRR', asOf: new Date().toISOString(), walletLiabilityRial: (liability._sum.balanceRial ?? 0n).toString(), gatewayReceivedRial: (received._sum.amountRial ?? 0n).toString(), topupReceivedRial: (topups._sum.amountRial ?? 0n).toString(), orderPaidRial: byPurpose('ORDER'), appointmentPaidRial: byPurpose('APPOINTMENT'), refundedRial: (refunds._sum.amountRial ?? 0n).toString(), administrativeCreditRial: (manual.find(row => row.kind === 'ADMIN_CREDIT')?._sum.deltaRial ?? 0n).toString(), administrativeDebitRial: (-(manual.find(row => row.kind === 'ADMIN_DEBIT')?._sum.deltaRial ?? 0n)).toString(), ledgerMismatchCount: Number(mismatch[0]?.count ?? 0n), source: 'shared-billing; legacy commerce payments reported by commerce revenue' };
    }, { isolationLevel: 'RepeatableRead' });
  }
}
