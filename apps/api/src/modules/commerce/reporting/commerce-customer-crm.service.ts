import { ForbiddenException, Injectable } from '@nestjs/common';

import { PatientAccessAction, Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import {
  ClinicalAccessAuditService,
  type ClinicalAuditContext,
} from '../../clinical/clinical-access-audit.service';
import {
  type CustomerCrmDirection,
  type CommerceCustomerCrmPageDto,
  type CommerceCustomerCrmQueryDto,
  type CustomerCrmSort,
  type CustomerCrmSegment,
} from './commerce-customer-crm.dto';

const CRM_RESOURCE_TYPE = 'ADMIN_COMMERCE_CUSTOMER_CRM';

type CustomerCrmRow = {
  patientId: string;
  displayName: string | null;
  accountStatus: 'ACTIVE' | 'DISABLED';
  segment: CustomerCrmSegment;
  successfulPurchaseCount: string;
  grossToman: string;
  completedRefundToman: string;
  netSpendToman: string;
  topProduct: string | null;
  lastPurchaseAt: Date | null;
};

type CustomerCrmSummaryRow = {
  totalCustomerCount: string;
  vipCustomerCount: string;
  summaryNetSpendToman: string;
  averageNetSpendToman: string;
};

const forbidden = () => new ForbiddenException({
  code: 'FORBIDDEN',
  message: 'The requested commerce customer scope is not available to this actor.',
  details: {},
});

const orderBy = (sort: CustomerCrmSort): Prisma.Sql => {
  switch (sort) {
    case 'SUCCESSFUL_PURCHASE_COUNT': return Prisma.sql`successful_purchase_count`;
    case 'LAST_PURCHASE_AT': return Prisma.sql`last_purchase_at`;
    case 'DISPLAY_NAME': return Prisma.sql`display_name`;
    case 'NET_SPEND': return Prisma.sql`net_spend_toman`;
  }
};

const direction = (value: CustomerCrmDirection): Prisma.Sql =>
  value === 'ASC' ? Prisma.sql`ASC` : Prisma.sql`DESC`;

@Injectable()
export class CommerceCustomerCrmService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clinicalAudit: ClinicalAccessAuditService,
  ) {}

  async list(
    query: CommerceCustomerCrmQueryDto,
    context: ClinicalAuditContext,
  ): Promise<CommerceCustomerCrmPageDto> {
    const clinic = await this.prisma.clinic.findFirst({
      where: {
        id: query.clinicId,
        status: 'ACTIVE',
        clinicalClinicAccesses: { some: { userId: context.actorUserId } },
      },
      select: { id: true, timeZone: true },
    });
    if (!clinic) throw forbidden();

    const search = query.search
      ? Prisma.sql`AND lower(concat_ws(' ', profile.first_name, profile.last_name)) LIKE lower(${`%${query.search}%`})`
      : Prisma.empty;
    const segment = query.segment
      ? Prisma.sql`WHERE segment = ${query.segment}`
      : Prisma.empty;
    const offset = (query.page - 1) * query.pageSize;

    const queryCte = Prisma.sql`
        WITH scoped_patients AS (
          SELECT
            patient.id AS patient_id,
            NULLIF(trim(concat_ws(' ', profile.first_name, profile.last_name)), '') AS display_name,
            account.status AS account_status
          FROM patient_profiles AS patient
          INNER JOIN users AS account ON account.id = patient.user_id
          LEFT JOIN user_profiles AS profile ON profile.user_id = account.id
          WHERE patient.clinic_id = ${clinic.id}::uuid
          ${search}
        ), payment_stats AS (
          SELECT
            purchase.patient_id,
            COUNT(payment.id)::bigint AS successful_purchase_count,
            COALESCE(SUM(payment.commerce_amount_toman), 0)::bigint AS gross_toman,
            MAX(payment.verified_at) AS last_purchase_at
          FROM commerce_orders AS purchase
          INNER JOIN payments AS payment ON payment.order_id = purchase.id
          WHERE purchase.clinic_id = ${clinic.id}::uuid
          GROUP BY purchase.patient_id
        ), refund_stats AS (
          SELECT
            purchase.patient_id,
            COALESCE(SUM(refund.amount_toman), 0)::bigint AS completed_refund_toman
          FROM commerce_orders AS purchase
          INNER JOIN payments AS payment ON payment.order_id = purchase.id
          INNER JOIN refunds AS refund ON refund.payment_id = payment.id
          WHERE purchase.clinic_id = ${clinic.id}::uuid
            AND refund.status = 'COMPLETED'
          GROUP BY purchase.patient_id
        ), product_quantities AS (
          SELECT
            purchase.patient_id,
            line.product_title_snapshot AS product_title,
            SUM(line.quantity)::bigint AS total_quantity
          FROM commerce_orders AS purchase
          INNER JOIN payments AS payment ON payment.order_id = purchase.id
          INNER JOIN commerce_order_lines AS line ON line.order_id = purchase.id
          WHERE purchase.clinic_id = ${clinic.id}::uuid
          GROUP BY purchase.patient_id, line.product_title_snapshot
        ), top_products AS (
          SELECT patient_id, product_title
          FROM (
            SELECT
              patient_id,
              product_title,
              ROW_NUMBER() OVER (
                PARTITION BY patient_id
                ORDER BY total_quantity DESC, product_title ASC
              ) AS position
            FROM product_quantities
          ) AS ranked_products
          WHERE position = 1
        ), customers AS (
          SELECT
            patient.patient_id AS "patientId",
            patient.display_name AS "displayName",
            patient.account_status AS "accountStatus",
            COALESCE(payment.successful_purchase_count, 0)::text AS "successfulPurchaseCount",
            COALESCE(payment.gross_toman, 0)::text AS "grossToman",
            COALESCE(refund.completed_refund_toman, 0)::text AS "completedRefundToman",
            (COALESCE(payment.gross_toman, 0) - COALESCE(refund.completed_refund_toman, 0))::text AS "netSpendToman",
            product.product_title AS "topProduct",
            payment.last_purchase_at AS "lastPurchaseAt",
            CASE
              WHEN COALESCE(payment.successful_purchase_count, 0) = 0 THEN 'POTENTIAL'
              WHEN COALESCE(payment.successful_purchase_count, 0) = 1 THEN 'ONE_TIME'
              WHEN COALESCE(payment.successful_purchase_count, 0) BETWEEN 2 AND 4 THEN 'RETURNING'
              ELSE 'VIP'
            END AS segment,
            COALESCE(payment.gross_toman, 0) - COALESCE(refund.completed_refund_toman, 0) AS net_spend_toman,
            COALESCE(payment.successful_purchase_count, 0) AS successful_purchase_count,
            patient.display_name AS display_name,
            payment.last_purchase_at AS last_purchase_at
          FROM scoped_patients AS patient
          LEFT JOIN payment_stats AS payment ON payment.patient_id = patient.patient_id
          LEFT JOIN refund_stats AS refund ON refund.patient_id = patient.patient_id
          LEFT JOIN top_products AS product ON product.patient_id = patient.patient_id
        ), filtered AS (
          SELECT * FROM customers
          ${segment}
        )`;

    const { rows, summary } = await this.prisma.$transaction(async (tx) => {
      const summaryRows = await tx.$queryRaw<CustomerCrmSummaryRow[]>(Prisma.sql`
        ${queryCte}
        SELECT
          COUNT(*)::text AS "totalCustomerCount",
          COUNT(*) FILTER (WHERE segment = 'VIP')::text AS "vipCustomerCount",
          COALESCE(SUM(net_spend_toman), 0)::text AS "summaryNetSpendToman",
          COALESCE(TRUNC(SUM(net_spend_toman) / NULLIF(COUNT(*), 0))::bigint, 0)::text AS "averageNetSpendToman"
        FROM filtered
      `);

      const values = await tx.$queryRaw<CustomerCrmRow[]>(Prisma.sql`
        ${queryCte}
        SELECT
          "patientId", "displayName", "accountStatus", segment,
          "successfulPurchaseCount", "grossToman", "completedRefundToman", "netSpendToman",
          "topProduct", "lastPurchaseAt"
        FROM filtered
        ORDER BY ${orderBy(query.sort)} ${direction(query.direction)} NULLS LAST, "patientId" ASC
        LIMIT ${query.pageSize} OFFSET ${offset}
      `);

      for (const row of values) {
        await this.clinicalAudit.record({
          clinicId: clinic.id,
          patientId: row.patientId,
          action: PatientAccessAction.READ,
          resourceType: CRM_RESOURCE_TYPE,
          resourceId: row.patientId,
          metadata: { source: 'COMMERCE_CUSTOMER_CRM', redaction: 'NON_MEDICAL' },
        }, context, tx);
      }

      return { rows: values, summary: summaryRows[0] };
    });

    const totalCustomerCount = Number(summary?.totalCustomerCount ?? 0);
    return {
      clinicId: clinic.id,
      currency: 'TOMAN',
      timeZone: clinic.timeZone,
      asOf: new Date(),
      page: query.page,
      pageSize: query.pageSize,
      totalCustomerCount,
      summary: {
        totalCustomerCount,
        vipCustomerCount: Number(summary?.vipCustomerCount ?? 0),
        netSpendToman: summary?.summaryNetSpendToman ?? '0',
        averageNetSpendToman: summary?.averageNetSpendToman ?? '0',
      },
      items: rows.map((row) => ({
        patientId: row.patientId,
        displayName: row.displayName,
        accountStatus: row.accountStatus,
        segment: row.segment,
        successfulPurchaseCount: Number(row.successfulPurchaseCount),
        grossToman: row.grossToman,
        completedRefundToman: row.completedRefundToman,
        netSpendToman: row.netSpendToman,
        topProduct: row.topProduct,
        lastPurchaseAt: row.lastPurchaseAt,
      })),
    };
  }
}
