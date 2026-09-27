import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PatientAccessAction, Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { ClinicalAccessAuditService, type ClinicalAuditContext } from '../../clinical/clinical-access-audit.service';
import { auditActions, type AuditViewerPageDto, type AuditViewerQueryDto } from './audit-viewer.dto';

const TIME_ZONE = 'Asia/Tehran' as const;
const AUDIT_VIEWER_RESOURCE_TYPE = 'AUDIT_VIEWER_READ';
const DEFAULT_WINDOW_DAYS = 30;
const MAX_WINDOW_DAYS = 366;
type Cursor = { createdAt: string; id: string };

const badRequest = (message: string): BadRequestException => new BadRequestException({ code: 'AUDIT_QUERY_INVALID', message, details: {} });
const localDate = (value: Date): string => new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(value);
const addDays = (date: Date, days: number): Date => new Date(date.getTime() + days * 86_400_000);
const redacted = (kind: string, value: string | null): string | null => value ? `${kind}:…${value.replaceAll('-', '').slice(-8)}` : null;
const encodeCursor = (value: Cursor): string => Buffer.from(JSON.stringify(value)).toString('base64url');

const startOfLocalDate = (value: string): Date => {
  const [year, month, day] = value.split('-').map(Number);
  const localCheck = new Date(Date.UTC(year, month - 1, day));
  if (localCheck.getUTCFullYear() !== year || localCheck.getUTCMonth() !== month - 1 || localCheck.getUTCDate() !== day) throw badRequest('Audit dates must be valid calendar dates.');
  const utcGuess = Date.UTC(year, month - 1, day);
  const offsetName = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, timeZoneName: 'longOffset' }).formatToParts(new Date(utcGuess)).find((part) => part.type === 'timeZoneName')?.value;
  const match = /^GMT([+-])(\d{2}):(\d{2})$/u.exec(offsetName ?? '');
  if (!match) throw badRequest('Could not resolve the reporting time zone.');
  const offset = (Number(match[2]) * 60 + Number(match[3])) * (match[1] === '+' ? 1 : -1);
  return new Date(utcGuess - offset * 60_000);
};

const decodeCursor = (value: string | undefined): Cursor | undefined => {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Cursor;
    if (!parsed || typeof parsed.createdAt !== 'string' || Number.isNaN(Date.parse(parsed.createdAt)) || typeof parsed.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(parsed.id)) throw new Error('invalid cursor');
    return parsed;
  } catch { throw badRequest('The audit cursor is invalid.'); }
};

@Injectable()
export class AuditViewerService {
  constructor(private readonly prisma: PrismaService, private readonly clinicalAudit: ClinicalAccessAuditService) {}

  async list(query: AuditViewerQueryDto, context: ClinicalAuditContext): Promise<AuditViewerPageDto> {
    const clinic = await this.resolveClinic(query.clinicId);
    const range = this.resolveRange(query.from, query.to);
    const cursor = decodeCursor(query.cursor);
    const where: Prisma.PatientAccessAuditWhereInput = {
      clinicId: clinic.id,
      ...(query.action ? { action: query.action } : {}),
      ...(query.actorId ? { actorUserId: query.actorId } : {}),
      NOT: { resourceType: AUDIT_VIEWER_RESOURCE_TYPE },
      ...(query.subjectType ? { resourceType: query.subjectType } : {}),
      createdAt: { gte: range.start, lt: range.endExclusive },
      ...(cursor ? { OR: [{ createdAt: { lt: new Date(cursor.createdAt) } }, { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } }] } : {}),
    };
    const rows = await this.prisma.patientAccessAudit.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      select: { id: true, action: true, actorUserId: true, patientId: true, resourceType: true, requestId: true, correlationId: true, createdAt: true },
    });
    const page = rows.slice(0, query.limit);
    await this.prisma.$transaction(async (tx) => {
      for (const row of page) {
        await this.clinicalAudit.record({
          clinicId: clinic.id,
          patientId: row.patientId,
          action: PatientAccessAction.READ,
          resourceType: AUDIT_VIEWER_RESOURCE_TYPE,
          resourceId: row.id,
          metadata: { source: 'CLINICAL_ACCESS_AUDIT', redaction: 'APPLIED' },
        }, context, tx);
      }
    });
    return {
      clinicId: clinic.id,
      timeZone: TIME_ZONE,
      from: range.from,
      to: range.to,
      asOf: new Date(),
      items: page.map((row) => ({
        id: row.id,
        action: row.action as (typeof auditActions)[number],
        actorReference: redacted('actor', row.actorUserId),
        subjectReference: redacted('subject', row.patientId) as string,
        subjectType: row.resourceType,
        requestCorrelationReference: redacted('request', row.correlationId ?? row.requestId),
        metadataSummary: { source: 'CLINICAL_ACCESS_AUDIT', redaction: 'APPLIED' },
        occurredAt: row.createdAt,
      })),
      nextCursor: rows.length > query.limit && page.length > 0 ? encodeCursor({ createdAt: page.at(-1)!.createdAt.toISOString(), id: page.at(-1)!.id }) : null,
    };
  }

  private async resolveClinic(clinicId?: string) {
    const clinic = await this.prisma.clinic.findFirst({ where: { ...(clinicId ? { id: clinicId } : {}), status: 'ACTIVE' }, orderBy: { createdAt: 'asc' }, select: { id: true } });
    if (!clinic) throw new NotFoundException({ code: 'CLINIC_NOT_FOUND', message: 'The requested active clinic was not found.', details: {} });
    return clinic;
  }

  private resolveRange(from?: string, to?: string) {
    const resolvedTo = to ?? localDate(new Date());
    const resolvedFrom = from ?? localDate(addDays(startOfLocalDate(resolvedTo), -(DEFAULT_WINDOW_DAYS - 1)));
    const start = startOfLocalDate(resolvedFrom);
    const endExclusive = addDays(startOfLocalDate(resolvedTo), 1);
    const days = Math.ceil((endExclusive.getTime() - start.getTime()) / 86_400_000);
    if (endExclusive <= start || days > MAX_WINDOW_DAYS) throw badRequest(`Audit date range must be between 1 and ${MAX_WINDOW_DAYS} local days.`);
    return { from: resolvedFrom, to: resolvedTo, start, endExclusive };
  }
}
