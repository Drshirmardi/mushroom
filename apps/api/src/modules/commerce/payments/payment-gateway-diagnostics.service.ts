import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { PaymentGatewayRequestDto, PaymentGatewayRequestsQueryDto, PaymentGatewayRequestDetailDto } from './payment-gateway-diagnostics.dto';

/** Only these transport classifications may cross the diagnostics boundary. No raw errors/payloads. */
export class GatewayTransportError extends Error {
  constructor(readonly kind: 'HTTP' | 'TIMEOUT' | 'NETWORK' | 'INVALID_RESPONSE', readonly httpStatus: number | null = null) { super('Payment transport failed'); }
}
const missing = () => new NotFoundException({ code: 'PAYMENT_ATTEMPT_NOT_FOUND', message: 'Payment request was not found.', details: {} });
type Row = Omit<PaymentGatewayRequestDto, 'createdAt' | 'updatedAt' | 'verifiedAt'> & { createdAt: Date; updatedAt: Date; verifiedAt: Date | null };

@Injectable()
export class PaymentGatewayDiagnosticsService {
  private readonly logger = new Logger(PaymentGatewayDiagnosticsService.name);
  constructor(private readonly prisma: PrismaService) {}

  /** Diagnostic writes must never change a financial outcome or expose a secret through an error. */
  async record(providerOrderId: bigint, stage: 'REQUEST' | 'VERIFY' | 'CALLBACK', startedAt: number, resultCode?: string, error?: unknown) {
    const durationMs = Math.max(0, Date.now() - startedAt);
    try {
      const billing = await this.prisma.billingGatewayAttempt.findUnique({ where: { providerOrderId }, select: { id: true } });
      const attempt = billing ?? await this.prisma.paymentAttempt.findUnique({ where: { providerOrderId }, select: { id: true } });
      if (!attempt) return;
      const code = resultCode && /^-?\d{1,31}$/u.test(resultCode) ? resultCode : null;
      await this.prisma.auditEvent.create({ data: {
        action: 'PAYMENT_GATEWAY_TRACE', subjectType: 'PAYMENT_GATEWAY_TRACE', subjectId: attempt.id,
        metadata: { source: billing ? 'BILLING' : 'COMMERCE', stage, outcome: error ? 'ERROR' : stage === 'CALLBACK' ? 'RECEIVED' : code === '0' || (stage === 'VERIFY' && code === '100') ? 'SUCCESS' : 'REJECTED',
          resultCode: code, durationMs,
          errorKind: error ? error instanceof GatewayTransportError ? error.kind : 'PROTOCOL_OR_CONFIGURATION' : null,
          httpStatus: error instanceof GatewayTransportError ? error.httpStatus : null },
      } });
    } catch { this.logger.warn('Payment diagnostic event could not be persisted'); }
  }

  async list(actorUserId: string, provider: string, query: PaymentGatewayRequestsQueryDto) {
    const scope = this.rows(actorUserId, provider);
    const search = query.query?.trim();
    // Literal substring search; UUIDs/order numbers/phones may be pasted directly.
    const term = `%${(search ?? '').replace(/[\\%_]/gu, '\\$&')}%`;
    const filter = Prisma.sql`WHERE (${!query.status} OR r.status = ${query.status ?? ''})
      AND (${!query.from} OR r."createdAt" >= ${query.from ? new Date(query.from) : new Date(0)})
      AND (${!query.until} OR r."createdAt" <= ${query.until ? new Date(query.until) : new Date()})
      AND (${!search} OR concat_ws(' ', r.id, r."intentId", r."orderId", r."providerOrderId", r.phone, r.name, r."resultCode") ILIKE ${term})`;
    const [rows, counts] = await this.prisma.$transaction([
      this.prisma.$queryRaw<Row[]>(Prisma.sql`SELECT * FROM (${scope}) r ${filter} ORDER BY r."createdAt" DESC, r.id DESC, r.source LIMIT ${query.pageSize} OFFSET ${(query.page - 1) * query.pageSize}`),
      this.prisma.$queryRaw<{ total: bigint }[]>(Prisma.sql`SELECT count(*) AS total FROM (${scope}) r ${filter}`),
    ]);
    return { items: rows.map(row => this.view(row)), total: Number(counts[0].total), page: query.page, pageSize: query.pageSize };
  }

  async detail(actorUserId: string, provider: string, source: string, id: string): Promise<PaymentGatewayRequestDetailDto> {
    if (!['BILLING', 'COMMERCE'].includes(source)) throw missing();
    const rows = await this.prisma.$queryRaw<Row[]>(Prisma.sql`SELECT * FROM (${this.rows(actorUserId, provider)}) r WHERE r.id = ${id}::uuid AND r.source = ${source} LIMIT 1`);
    if (!rows[0]) throw missing();
    const events = await this.prisma.auditEvent.findMany({ where: { subjectType: 'PAYMENT_GATEWAY_TRACE', subjectId: id, action: 'PAYMENT_GATEWAY_TRACE' }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 101, select: { id: true, createdAt: true, metadata: true } });
    return { request: this.view(rows[0]), eventsTruncated: events.length > 100, events: events.slice(0, 100).reverse().flatMap(event => {
      if (!event.metadata || typeof event.metadata !== 'object' || Array.isArray(event.metadata)) return [];
      const m = event.metadata as Record<string, unknown>;
      if (m.source !== source || !['REQUEST', 'VERIFY', 'CALLBACK'].includes(String(m.stage)) || !['ERROR', 'RECEIVED', 'SUCCESS', 'REJECTED'].includes(String(m.outcome))) return [];
      return [{ id: event.id, at: event.createdAt.toISOString(), stage: String(m.stage), outcome: String(m.outcome), resultCode: typeof m.resultCode === 'string' && /^-?\d{1,31}$/u.test(m.resultCode) ? m.resultCode : null,
        errorKind: typeof m.errorKind === 'string' && ['HTTP', 'TIMEOUT', 'NETWORK', 'INVALID_RESPONSE', 'PROTOCOL_OR_CONFIGURATION'].includes(m.errorKind) ? m.errorKind : null,
        httpStatus: typeof m.httpStatus === 'number' ? m.httpStatus : null, durationMs: typeof m.durationMs === 'number' ? m.durationMs : 0 }];
    }) };
  }

  private view(row: Row): PaymentGatewayRequestDto { return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), verifiedAt: row.verifiedAt?.toISOString() ?? null }; }
  private rows(actor: string, provider: string) {
    const common = Prisma.sql`JOIN payment_provider_configs c ON c.id = v.config_id
      JOIN patient_profiles p ON p.id = patient_id_ref JOIN users u ON u.id = p.user_id
      LEFT JOIN user_profiles up ON up.user_id = u.id
      WHERE c.provider_code = ${provider} AND c.clinic_id = clinic_id_ref AND p.clinic_id = clinic_id_ref AND EXISTS (SELECT 1 FROM clinical_clinic_accesses ca WHERE ca.clinic_id = clinic_id_ref AND ca.user_id = ${actor}::uuid)`;
    // Both systems keep immutable attempts; do not select provider tokens or credential payloads.
    return Prisma.sql`SELECT a.id::text, 'BILLING'::text AS source, p.id::text AS "patientId", u.id::text AS "userId", u.phone,
      concat_ws(' ', up.first_name, up.last_name) AS name, i.purpose::text, i.id::text AS "intentId", i.order_id::text AS "orderId",
      a.provider_order_id::text AS "providerOrderId", v.revision_number AS "revisionNumber", a.amount_rial::text AS "amountRial", a.status::text,
      a.result_code AS "resultCode", a.reference, a.trace_number AS "traceNumber", a.created_at AS "createdAt", a.updated_at AS "updatedAt", a.verified_at AS "verifiedAt"
      FROM billing_gateway_attempts a JOIN billing_intents i ON i.id = a.intent_id
      CROSS JOIN LATERAL (SELECT i.patient_id AS patient_id_ref, i.clinic_id AS clinic_id_ref) owner
      JOIN payment_provider_config_revisions v ON v.id = a.revision_id ${common}
      UNION ALL
      SELECT a.id::text, 'COMMERCE'::text, p.id::text, u.id::text, u.phone, concat_ws(' ', up.first_name, up.last_name), 'ORDER'::text, NULL::text, a.order_id::text,
      a.provider_order_id::text, v.revision_number, (a.commerce_amount_toman::numeric * 10)::text, a.status::text, a.provider_result_code, pay.provider_reference_id, pay.provider_trace_number, a.created_at, a.updated_at, a.verified_at
      FROM payment_attempts a CROSS JOIN LATERAL (SELECT a.patient_id AS patient_id_ref, a.clinic_id AS clinic_id_ref) owner
      LEFT JOIN payments pay ON pay.payment_attempt_id = a.id
      JOIN payment_provider_config_revisions v ON v.id = a.provider_config_revision_id ${common}`;
  }
}
