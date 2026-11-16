import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Prisma, type PatientProfile } from '../../generated/prisma/client';
import {
  FinancialContext,
  Tx,
  MAX_MONEY,
  financialAudit,
  financialConflict,
  financialForbidden,
  financialKey,
  fingerprint,
  invalidMoney,
  lockFinancial,
  money,
  reasonText,
} from './billing.policy';
import { OutboxService } from '../outbox/outbox.service';

export type WalletAdjustment = {
  type: 'CREDIT' | 'DEBIT' | 'SET_BALANCE';
  amountToman: string;
  expectedVersion: number;
  reason: string;
};

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

  async patient(userId: string) {
    const patient = await this.prisma.patientProfile.findFirst({
      where: { userId, user: { status: 'ACTIVE' }, clinic: { status: 'ACTIVE' } },
    });
    if (!patient) throw financialForbidden();
    return patient;
  }

  async adminPatient(actorUserId: string, patientId: string) {
    const patient = await this.prisma.patientProfile.findFirst({
      where: {
        id: patientId,
        clinic: { status: 'ACTIVE', clinicalClinicAccesses: { some: { userId: actorUserId } } },
      },
    });
    if (!patient) throw financialForbidden();
    return patient;
  }

  async summary(patient: PatientProfile) {
    const account = await this.prisma.walletAccount.findUnique({
      where: { patientId: patient.id },
    });
    return {
      patientId: patient.id,
      currency: 'IRR',
      balanceRial: account?.balanceRial.toString() ?? '0',
      version: account?.version ?? 0,
      frozen: account?.frozen ?? false,
      asOf: new Date().toISOString(),
    };
  }

  async transactions(patient: PatientProfile, page: number, pageSize: number, admin = false) {
    const where = { account: { patientId: patient.id, clinicId: patient.clinicId } };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.walletJournal.count({ where }),
      this.prisma.walletJournal.findMany({
        where,
        include: {
          actor: { select: { userProfile: { select: { firstName: true, lastName: true } } } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      page,
      pageSize,
      total,
      items: rows.map((row) => ({
        id: row.id,
        kind: row.kind,
        deltaRial: row.deltaRial.toString(),
        balanceAfterRial: row.afterRial.toString(),
        reference: row.reference,
        createdAt: row.createdAt.toISOString(),
        ...(admin
          ? {
              actorUserId: row.actorUserId,
              actorDisplayName: row.actor?.userProfile
                ? `${row.actor.userProfile.firstName ?? ''} ${row.actor.userProfile.lastName ?? ''}`.trim() ||
                  null
                : null,
              reason: row.reason,
              balanceBeforeRial: row.beforeRial.toString(),
            }
          : {}),
      })),
    };
  }

  async adjust(
    context: FinancialContext,
    patientId: string,
    body: WalletAdjustment,
    rawKey: string | undefined,
  ) {
    const patient = await this.adminPatient(context.actorUserId, patientId);
    const key = financialKey(rawKey);
    const reason = reasonText(body.reason);
    const amount = money(body.amountToman, body.type === 'SET_BALANCE');
    const hash = fingerprint({ patientId, ...body, reason });
    return this.prisma.$transaction(
      async (tx) => {
        await lockFinancial(tx, `wallet-command:${context.actorUserId}:${key}`);
        const previous = await tx.walletCommand.findUnique({
          where: {
            actorUserId_idempotencyKey: { actorUserId: context.actorUserId, idempotencyKey: key },
          },
        });
        if (previous) {
          if (previous.fingerprint !== hash) throw financialConflict('IDEMPOTENCY_KEY_REUSED');
          return previous.response;
        }
        const account = await this.lockAccount(tx, patient);
        if (account.version !== body.expectedVersion)
          throw financialConflict('WALLET_VERSION_CONFLICT');
        const delta =
          body.type === 'SET_BALANCE'
            ? amount - account.balanceRial
            : body.type === 'DEBIT'
              ? -amount
              : amount;
        const journal =
          delta === 0n
            ? null
            : await this.post(
                tx,
                patient,
                delta,
                delta > 0n ? 'ADMIN_CREDIT' : 'ADMIN_DEBIT',
                `admin:${context.actorUserId}:${key}`,
                context,
                reason,
              );
        const response = {
          patientId,
          currency: 'IRR',
          beforeRial: account.balanceRial.toString(),
          balanceRial: (account.balanceRial + delta).toString(),
          deltaRial: delta.toString(),
          version: account.version + (delta === 0n ? 0 : 1),
          journalId: journal?.id ?? null,
        };
        await financialAudit(tx, context, 'WALLET_ADMIN_ADJUSTED', patientId, {
          type: body.type,
          deltaRial: response.deltaRial,
          beforeRial: response.beforeRial,
          afterRial: response.balanceRial,
          journalId: response.journalId,
          hasReason: true,
        });
        await tx.walletCommand.create({
          data: {
            actorUserId: context.actorUserId,
            idempotencyKey: key,
            fingerprint: hash,
            response,
          },
        });
        return response;
      },
      { timeout: 15_000 },
    );
  }

  async setStatus(
    context: FinancialContext,
    patientId: string,
    body: { frozen: boolean; reason: string; expectedVersion: number },
    rawKey: string | undefined,
  ) {
    const patient = await this.adminPatient(context.actorUserId, patientId);
    const key = financialKey(rawKey);
    const reason = reasonText(body.reason);
    const hash = fingerprint({ patientId, ...body, reason });
    return this.prisma.$transaction(async (tx) => {
      await lockFinancial(tx, `wallet-command:${context.actorUserId}:${key}`);
      const previous = await tx.walletCommand.findUnique({
        where: {
          actorUserId_idempotencyKey: { actorUserId: context.actorUserId, idempotencyKey: key },
        },
      });
      if (previous) {
        if (previous.fingerprint !== hash) throw financialConflict('IDEMPOTENCY_KEY_REUSED');
        return previous.response;
      }
      const account = await this.lockAccount(tx, patient);
      if (account.version !== body.expectedVersion)
        throw financialConflict('WALLET_VERSION_CONFLICT');
      const updated = await tx.walletAccount.update({
        where: { id: account.id },
        data: { frozen: body.frozen, version: { increment: 1 } },
      });
      const response = { frozen: updated.frozen, version: updated.version };
      await financialAudit(tx, context, 'WALLET_STATUS_CHANGED', account.id, {
        frozen: body.frozen,
        reason,
      });
      await tx.walletCommand.create({
        data: {
          actorUserId: context.actorUserId,
          idempotencyKey: key,
          fingerprint: hash,
          response,
        },
      });
      return response;
    });
  }

  async lockAccount(tx: Tx, patient: Pick<PatientProfile, 'id' | 'clinicId'>) {
    const account = await tx.walletAccount.upsert({
      where: { ownerKey: `patient:${patient.id}` },
      create: {
        ownerKey: `patient:${patient.id}`,
        patientId: patient.id,
        clinicId: patient.clinicId,
      },
      update: {},
    });
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM wallet_accounts WHERE id = ${account.id}::uuid FOR UPDATE`,
    );
    return tx.walletAccount.findUniqueOrThrow({ where: { id: account.id } });
  }

  async post(
    tx: Tx,
    patient: Pick<PatientProfile, 'id' | 'clinicId' | 'userId'>,
    deltaRial: bigint,
    kind: string,
    reference: string,
    context: FinancialContext,
    reason?: string,
  ) {
    if (!deltaRial || deltaRial > MAX_MONEY || deltaRial < -MAX_MONEY) throw invalidMoney();
    const account = await this.lockAccount(tx, patient);
    const existing = await tx.walletJournal.findUnique({ where: { reference } });
    if (existing) {
      if (
        existing.accountId !== account.id ||
        existing.deltaRial !== deltaRial ||
        existing.kind !== kind
      )
        throw financialConflict('IDEMPOTENCY_KEY_REUSED');
      return existing;
    }
    if (kind === 'PAYMENT' && account.frozen) throw financialConflict('WALLET_FROZEN');
    if (account.balanceRial + deltaRial < 0n) throw financialConflict('WALLET_INSUFFICIENT_FUNDS');
    if (account.balanceRial + deltaRial > MAX_MONEY) throw invalidMoney();
    const counter = await tx.walletAccount.upsert({
      where: { ownerKey: `clearing:${patient.clinicId}` },
      create: { ownerKey: `clearing:${patient.clinicId}`, clinicId: patient.clinicId },
      update: {},
    });
    const journal = await tx.walletJournal.create({
      data: {
        accountId: account.id,
        counterAccountId: counter.id,
        kind,
        reference,
        deltaRial,
        beforeRial: account.balanceRial,
        afterRial: account.balanceRial + deltaRial,
        version: account.version + 1,
        actorUserId: context.actorUserId,
        reason,
        entries: {
          create: [
            { accountId: account.id, deltaRial },
            { accountId: counter.id, deltaRial: -deltaRial },
          ],
        },
      },
    });
    await tx.walletAccount.update({
      where: { id: account.id },
      data: { balanceRial: { increment: deltaRial }, version: { increment: 1 } },
    });
    await tx.walletAccount.update({
      where: { id: counter.id },
      data: { balanceRial: { decrement: deltaRial }, version: { increment: 1 } },
    });
    await this.outbox.enqueue(tx, {
      eventType: 'WALLET_CHANGED',
      aggregateType: 'WALLET',
      aggregateId: journal.id,
      idempotencyKey: `wallet-notification:${journal.id}`,
      payload: {
        patientId: patient.id,
        clinicId: patient.clinicId,
        recipientId: patient.userId,
        category: 'FINANCIAL',
        title: 'تغییر موجودی کیف پول',
        body: 'موجودی کیف پول شما تغییر کرد. جزئیات در گردش کیف پول قابل مشاهده است.',
      },
    });
    return journal;
  }
}
