import { ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma } from '../../generated/prisma/client';

export type FinancialContext = { actorUserId: string; actorSessionId: string | null; requestId: string; ipAddress: string | null };
export type Tx = Prisma.TransactionClient;
export const MAX_MONEY = 9_000_000_000_000_000_000n;
export const pendingAttempts = ['CREATED', 'REDIRECT_READY', 'VERIFYING', 'REQUIRES_RECONCILIATION'];
export const financialConflict = (code = 'BILLING_STATE_CONFLICT') => new ConflictException({ code, message: 'The financial operation conflicts with the current state.', details: {} });
export const financialMissing = () => new NotFoundException({ code: 'BILLING_INTENT_NOT_FOUND', message: 'The financial resource was not found.', details: {} });
export const financialForbidden = () => new ForbiddenException({ code: 'FORBIDDEN', message: 'This financial scope is not available.', details: {} });
export const invalidMoney = () => new UnprocessableEntityException({ code: 'BILLING_INPUT_INVALID', message: 'The financial input is invalid.', details: {} });
export const fingerprint = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function financialKey(value: string | undefined) {
  const key = value?.trim();
  if (!key || key.length > 200 || !/^[\x21-\x7e]+$/u.test(key)) throw new UnprocessableEntityException({ code: 'IDEMPOTENCY_KEY_REQUIRED', message: 'A valid Idempotency-Key is required.', details: {} });
  return key;
}
export function money(value: string, zero = false) {
  const amount = moneyRial(value, zero);
  if (amount > MAX_MONEY / 10n) throw invalidMoney();
  return amount * 10n;
}
export function moneyRial(value: string, zero = false) {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]{0,18})$/u.test(value)) throw invalidMoney();
  const amount = BigInt(value);
  if ((!zero && amount === 0n) || amount > MAX_MONEY) throw invalidMoney();
  return amount;
}
export function reasonText(value: string) {
  const reason = typeof value === 'string' ? value.normalize('NFKC').trim() : '';
  if (!reason || reason.length > 500) throw invalidMoney();
  return reason;
}
export async function lockFinancial(tx: Tx, key: string) {
  await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text AS locked`);
}
export async function financialAudit(tx: Tx, context: FinancialContext, action: string, subjectId: string, metadata: Prisma.InputJsonValue) {
  await tx.auditEvent.create({ data: { action, actorUserId: context.actorUserId, actorSessionId: context.actorSessionId, subjectType: 'BILLING', subjectId, requestId: context.requestId.slice(0, 128), ipAddress: context.ipAddress, metadata } });
}
