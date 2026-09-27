import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import type { CommerceRevenueGranularity, CommerceRevenueQueryDto } from './commerce-revenue.dto';

type Bucket = { gross: bigint; refund: bigint; count: number };
const dateFormatter = (timeZone: string) => new Intl.DateTimeFormat('en-CA-u-ca-gregory-nu-latn', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
const partsFor = (value: Date, timeZone: string) => Object.fromEntries(dateFormatter(timeZone).formatToParts(value).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value])) as Record<string, string>;
const localDay = (value: Date, timeZone: string) => { const parts = partsFor(value, timeZone); return `${parts.year}-${parts.month}-${parts.day}`; };
const addDays = (date: string, days: number) => { const [year, month, day] = date.split('-').map(Number); return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10); };
const isCalendarDate = (date: string) => { const [year, month, day] = date.split('-').map(Number); const candidate = new Date(Date.UTC(year, month - 1, day)); return candidate.getUTCFullYear() === year && candidate.getUTCMonth() === month - 1 && candidate.getUTCDate() === day; };

// Converts clinic-local midnight to the UTC persistence boundary without using browser locale/timezone.
const zonedMidnight = (date: string, timeZone: string) => {
  const [year, month, day] = date.split('-').map(Number);
  let value = Date.UTC(year, month - 1, day);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = new Intl.DateTimeFormat('en-CA-u-ca-gregory-nu-latn', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(value));
    const part = (kind: string) => Number(parts.find((item) => item.type === kind)?.value);
    value += Date.UTC(year, month - 1, day) - Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'), part('second'));
  }
  return new Date(value);
};

const bucketKey = (value: Date, timeZone: string, granularity: CommerceRevenueGranularity) => {
  const day = localDay(value, timeZone);
  if (granularity === 'DAY') return day;
  if (granularity === 'MONTH') return day.slice(0, 7);
  const [year, month, date] = day.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, date)).getUTCDay();
  // ISO week (Monday start), derived from the clinic-local Gregorian day.
  return addDays(day, weekday === 0 ? -6 : 1 - weekday);
};

@Injectable()
export class CommerceRevenueService {
  constructor(private readonly prisma: PrismaService) {}

  async report(query: CommerceRevenueQueryDto) {
    const clinic = await this.prisma.clinic.findFirst({ where: { status: 'ACTIVE', ...(query.clinicId ? { id: query.clinicId } : {}) }, select: { id: true, timeZone: true } });
    if (!clinic) throw new NotFoundException({ code: 'CLINIC_NOT_FOUND', message: 'The active clinic was not found.', details: {} });
    const today = localDay(new Date(), clinic.timeZone);
    const from = query.from ?? addDays(today, -29);
    const to = query.to ?? today;
    if (!isCalendarDate(from) || !isCalendarDate(to) || from > to || addDays(from, 366) < to) throw new BadRequestException({ code: 'COMMERCE_REVENUE_RANGE_INVALID', message: 'Revenue range is invalid.', details: {} });

    const start = zonedMidnight(from, clinic.timeZone);
    const end = zonedMidnight(addDays(to, 1), clinic.timeZone);
    const granularity = query.granularity ?? 'DAY';
    const asOf = new Date();
    const [payments, refunds] = await Promise.all([
      this.prisma.payment.findMany({ where: { order: { clinicId: clinic.id }, verifiedAt: { gte: start, lt: end } }, select: { commerceAmountToman: true, verifiedAt: true } }),
      this.prisma.refund.findMany({ where: { status: 'COMPLETED', completedAt: { gte: start, lt: end }, payment: { order: { clinicId: clinic.id } } }, select: { amountToman: true, completedAt: true } }),
    ]);
    const buckets = new Map<string, Bucket>();
    const bucket = (key: string) => { const found = buckets.get(key); if (found) return found; const next = { gross: 0n, refund: 0n, count: 0 }; buckets.set(key, next); return next; };
    for (const payment of payments) { const target = bucket(bucketKey(payment.verifiedAt, clinic.timeZone, granularity)); target.gross += payment.commerceAmountToman; target.count += 1; }
    for (const refund of refunds) { const target = bucket(bucketKey(refund.completedAt!, clinic.timeZone, granularity)); target.refund += refund.amountToman; }
    const gross = payments.reduce((sum, payment) => sum + payment.commerceAmountToman, 0n);
    const completedRefund = refunds.reduce((sum, refund) => sum + refund.amountToman, 0n);
    return { clinicId: clinic.id, currency: 'TOMAN' as const, timeZone: clinic.timeZone, from, to, asOf, sourceStatus: 'current' as const, revenueLabel: 'operational revenue' as const, grossCapturedToman: gross.toString(), completedRefundToman: completedRefund.toString(), netRevenueToman: (gross - completedRefund).toString(), successfulPaymentCount: payments.length, series: [...buckets.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([date, value]) => ({ date, grossCapturedToman: value.gross.toString(), completedRefundToman: value.refund.toString(), netRevenueToman: (value.gross - value.refund).toString(), successfulPaymentCount: value.count })) };
  }
}
