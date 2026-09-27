import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { Prisma } from '../src/generated/prisma/client';
import type { PrismaService } from '../src/database/prisma/prisma.service';

type ExplainDocument = Array<{
  Plan: Record<string, unknown>;
  'Planning Time': number;
  'Execution Time': number;
}>;
type ExplainRow = { 'QUERY PLAN': ExplainDocument };
type PlanSummary = { name: string; nodeType: string; planningMs: number; executionMs: number; sharedBlocks: number; hasClinicScope: boolean };

const sourceDatabaseUrl = process.env.DATABASE_URL;
const databaseName = `sabz_zendegi_reporting_query_plan_${randomUUID().replaceAll('-', '')}`;
const rangeStart = new Date('2026-03-20T20:30:00.000Z');
const rangeEnd = new Date('2026-03-21T20:30:00.000Z');
let adminClient: Client | undefined;
let app: NestFastifyApplication | undefined;
let prisma: PrismaService;
let clinicId: string;

const databaseUrl = () => {
  if (!sourceDatabaseUrl) throw new Error('DATABASE_URL is required for reporting query-plan integration tests.');
  const url = new URL(sourceDatabaseUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
};

const sharedBlocks = (value: unknown): number => {
  if (!value || typeof value !== 'object') return 0;
  if (Array.isArray(value)) return value.reduce((total, item) => total + sharedBlocks(item), 0);
  return Object.entries(value as Record<string, unknown>).reduce((total, [key, item]) => total + (key === 'Shared Hit Blocks' || key === 'Shared Read Blocks' ? Number(item) : sharedBlocks(item)), 0);
};

async function explain(name: string, statement: Prisma.Sql): Promise<PlanSummary> {
  const rows = await prisma.$queryRaw<ExplainRow[]>(Prisma.sql`EXPLAIN (ANALYZE, BUFFERS, COSTS OFF, FORMAT JSON) ${statement}`);
  const document = rows[0]?.['QUERY PLAN'];
  const root = document?.[0];
  expect(root).toBeDefined();
  expect(root?.['Planning Time']).toEqual(expect.any(Number));
  expect(root?.['Execution Time']).toEqual(expect.any(Number));
  const summary = {
    name,
    nodeType: String(root?.Plan['Node Type']),
    planningMs: root?.['Planning Time'] ?? -1,
    executionMs: root?.['Execution Time'] ?? -1,
    sharedBlocks: sharedBlocks(root?.Plan),
    hasClinicScope: JSON.stringify(root?.Plan).includes(clinicId),
  };
  expect(summary.hasClinicScope).toBe(true);
  return summary;
}

describe('F11-T05 reporting query plans (disposable PostgreSQL)', () => {
  beforeAll(async () => {
    if (!sourceDatabaseUrl) throw new Error('DATABASE_URL is required for reporting query-plan integration tests.');
    const adminUrl = new URL(sourceDatabaseUrl);
    adminUrl.pathname = '/postgres';
    adminClient = new Client({ connectionString: adminUrl.toString() });
    await adminClient.connect();
    await adminClient.query(`CREATE DATABASE "${databaseName}"`);

    const prismaCli = resolve(process.cwd(), 'node_modules/prisma/build/index.js');
    const environment = { ...process.env, DATABASE_URL: databaseUrl(), DEV_DASHBOARD_ADMIN_PHONE: '', DEV_DASHBOARD_ADMIN_PASSWORD: '' };
    const migration = spawnSync(process.execPath, [prismaCli, 'migrate', 'deploy', '--config', 'prisma.config.ts'], { cwd: process.cwd(), env: environment, encoding: 'utf8' });
    expect(migration.status, migration.stderr).toBe(0);
    const seed = spawnSync(process.execPath, ['prisma/seed.mjs'], { cwd: process.cwd(), env: environment, encoding: 'utf8' });
    expect(seed.status, seed.stderr).toBe(0);

    process.env.DATABASE_URL = databaseUrl();
    const { createApiApplication } = await import('../src/app.factory.js');
    const { PrismaService } = await import('../src/database/prisma/prisma.service.js');
    app = await createApiApplication();
    await app.init();
    prisma = app.get(PrismaService);
    clinicId = (await prisma.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' }, select: { id: true } })).id;

    const offering = await prisma.doctorService.findFirstOrThrow({ where: { clinicId, isActive: true }, select: { id: true, doctorId: true } });
    const user = await prisma.user.create({ data: { phone: `+989${Math.floor(100_000_000 + Math.random() * 900_000_000)}`, userProfile: { create: { firstName: 'Plan', lastName: 'Fixture' } }, patientProfile: { create: { clinicId } } }, include: { patientProfile: true } });
    const patientId = user.patientProfile!.id;
    const appointmentAt = new Date('2026-03-21T04:00:00.000Z');
    await prisma.appointment.createMany({ data: [
      { clinicId, patientId, doctorServiceId: offering.id, doctorId: offering.doctorId, startsAt: appointmentAt, endsAt: new Date(appointmentAt.getTime() + 30 * 60_000), status: 'COMPLETED', priceAmount: 0, currency: 'IRR', priceCapturedAt: appointmentAt, checkedInAt: appointmentAt, startedAt: new Date(appointmentAt.getTime() + 5 * 60_000), completedAt: new Date(appointmentAt.getTime() + 20 * 60_000) },
      { clinicId, patientId, doctorServiceId: offering.id, doctorId: offering.doctorId, startsAt: new Date(appointmentAt.getTime() + 60 * 60_000), endsAt: new Date(appointmentAt.getTime() + 90 * 60_000), status: 'CANCELLED', priceAmount: 0, currency: 'IRR', priceCapturedAt: appointmentAt, cancelledAt: new Date(appointmentAt.getTime() + 65 * 60_000) },
      { clinicId, patientId, doctorServiceId: offering.id, doctorId: offering.doctorId, startsAt: new Date(appointmentAt.getTime() + 120 * 60_000), endsAt: new Date(appointmentAt.getTime() + 150 * 60_000), status: 'NO_SHOW', priceAmount: 0, currency: 'IRR', priceCapturedAt: appointmentAt, noShowAt: new Date(appointmentAt.getTime() + 125 * 60_000) },
    ] });

    const assessment = await prisma.assessmentVersion.create({ data: { clinicId, assessmentKey: `query-plan-${randomUUID()}`, versionNumber: 1, title: 'Query plan fixture', structure: {}, contentHash: 'b'.repeat(64), status: 'DRAFT' } });
    await prisma.patientAssessmentSubmission.createMany({ data: [
      { patientId, assessmentVersionId: assessment.id, attemptNumber: 1, state: 'COMPLETE', startedAt: appointmentAt, completedAt: new Date(appointmentAt.getTime() + 10 * 60_000), resultSnapshot: { snapshotVersion: 1 }, completionIdempotencyKey: `query-plan-completion-${randomUUID()}`, completionPayloadHash: 'c'.repeat(64) },
      { patientId, assessmentVersionId: assessment.id, attemptNumber: 2, state: 'IN_PROGRESS', startedAt: appointmentAt },
    ] });
    const plan = await prisma.treatmentPlan.create({ data: { clinicId, patientId, state: 'ACTIVE' } });
    await prisma.treatmentTask.createMany({ data: [
      { treatmentPlanId: plan.id, kind: 'EXERCISE', state: 'SCHEDULED', scheduledFor: appointmentAt },
      { treatmentPlanId: plan.id, kind: 'EXERCISE', state: 'COMPLETED', scheduledFor: appointmentAt, completedAt: new Date(appointmentAt.getTime() + 10 * 60_000) },
    ] });

    const config = await prisma.paymentProviderConfig.create({ data: { clinicId, providerCode: `query-plan-${randomUUID().slice(0, 12)}`, providerUnit: 'TEST', enabled: false, goLiveReady: false } });
    const revision = await prisma.paymentProviderConfigRevision.create({ data: { configId: config.id, revisionNumber: 1, providerUnit: 'TEST', goLiveReady: false, capabilitySnapshot: {} } });
    const order = await prisma.commerceOrder.create({ data: { clinicId, patientId, idempotencyKey: `query-plan-order-${randomUUID()}`, shippingMethod: 'PICKUP', subtotalAmountToman: 100_000n, totalAmountToman: 100_000n } });
    const attempt = await prisma.paymentAttempt.create({ data: { clinicId, patientId, orderId: order.id, providerConfigRevisionId: revision.id, providerOrderId: BigInt(Date.now()), commerceAmountToman: 100_000n, providerAmount: 1_000_000n, providerUnit: 'IRR_TEST_ONLY', status: 'VERIFIED', idempotencyKey: `query-plan-attempt-${randomUUID()}`, verifiedAt: appointmentAt } });
    const payment = await prisma.payment.create({ data: { orderId: order.id, paymentAttemptId: attempt.id, commerceAmountToman: 100_000n, providerAmount: 1_000_000n, providerUnit: 'IRR_TEST_ONLY', providerReferenceId: `query-plan-reference-${randomUUID()}`, status: 'VERIFIED', verifiedAt: appointmentAt } });
    await prisma.refund.createMany({ data: [
      { paymentId: payment.id, amountToman: 10_000n, status: 'COMPLETED', idempotencyKey: `query-plan-completed-${randomUUID()}`, completedAt: new Date(appointmentAt.getTime() + 5 * 60_000), evidenceReference: 'fixture' },
      { paymentId: payment.id, amountToman: 10_000n, status: 'REQUESTED', idempotencyKey: `query-plan-requested-${randomUUID()}` },
    ] });
  }, 90_000);

  afterAll(async () => {
    await app?.close();
    process.env.DATABASE_URL = sourceDatabaseUrl;
    if (adminClient) {
      await adminClient.query(`DROP DATABASE IF EXISTS "${databaseName}"`).catch(() => undefined);
      await adminClient.end().catch(() => undefined);
    }
  });

  it('captures and replays each real clinic-scoped report query without assuming an index or aggregate', async () => {
    const statements: Array<[string, Prisma.Sql]> = [
      ['appointments-scheduled', Prisma.sql`SELECT count(*) FROM appointments WHERE clinic_id = ${clinicId}::uuid AND starts_at >= ${rangeStart} AND starts_at < ${rangeEnd}`],
      ['appointments-completed', Prisma.sql`SELECT count(*) FROM appointments WHERE clinic_id = ${clinicId}::uuid AND status = 'COMPLETED' AND completed_at >= ${rangeStart} AND completed_at < ${rangeEnd}`],
      ['appointments-cancelled', Prisma.sql`SELECT count(*) FROM appointments WHERE clinic_id = ${clinicId}::uuid AND status = 'CANCELLED' AND cancelled_at >= ${rangeStart} AND cancelled_at < ${rangeEnd}`],
      ['appointments-no-show', Prisma.sql`SELECT count(*) FROM appointments WHERE clinic_id = ${clinicId}::uuid AND status = 'NO_SHOW' AND no_show_at >= ${rangeStart} AND no_show_at < ${rangeEnd}`],
      ['appointments-wait-values', Prisma.sql`SELECT checked_in_at, started_at FROM appointments WHERE clinic_id = ${clinicId}::uuid AND starts_at >= ${rangeStart} AND starts_at < ${rangeEnd} AND checked_in_at IS NOT NULL AND started_at IS NOT NULL`],
      ['appointments-page', Prisma.sql`SELECT id, starts_at, status FROM appointments WHERE clinic_id = ${clinicId}::uuid AND starts_at >= ${rangeStart} AND starts_at < ${rangeEnd} ORDER BY starts_at ASC, id ASC LIMIT ${21}`],
      ['patients-created', Prisma.sql`SELECT count(*) FROM patient_profiles WHERE clinic_id = ${clinicId}::uuid AND created_at >= ${rangeStart} AND created_at < ${rangeEnd}`],
      ['patients-onboarding-population', Prisma.sql`SELECT patient.id FROM patient_profiles AS patient WHERE patient.clinic_id = ${clinicId}::uuid`],
      ['assessments-started', Prisma.sql`SELECT count(*) FROM patient_assessment_submissions AS submission JOIN patient_profiles AS patient ON patient.id = submission.patient_id WHERE patient.clinic_id = ${clinicId}::uuid AND submission.started_at >= ${rangeStart} AND submission.started_at < ${rangeEnd}`],
      ['assessments-completion-cohort', Prisma.sql`SELECT count(*) FROM patient_assessment_submissions AS submission JOIN patient_profiles AS patient ON patient.id = submission.patient_id WHERE patient.clinic_id = ${clinicId}::uuid AND submission.started_at >= ${rangeStart} AND submission.started_at < ${rangeEnd} AND submission.state IN ('IN_PROGRESS', 'COMPLETE')`],
      ['assessments-completed', Prisma.sql`SELECT count(*) FROM patient_assessment_submissions AS submission JOIN patient_profiles AS patient ON patient.id = submission.patient_id WHERE patient.clinic_id = ${clinicId}::uuid AND submission.started_at >= ${rangeStart} AND submission.started_at < ${rangeEnd} AND submission.state = 'COMPLETE' AND submission.completed_at <= ${rangeEnd}`],
      ['treatment-active-plans', Prisma.sql`SELECT count(*) FROM treatment_plans WHERE clinic_id = ${clinicId}::uuid AND state = 'ACTIVE'`],
      ['treatment-tasks-due', Prisma.sql`SELECT count(*) FROM treatment_tasks AS task JOIN treatment_plans AS plan ON plan.id = task.treatment_plan_id WHERE plan.clinic_id = ${clinicId}::uuid AND task.state = 'SCHEDULED' AND task.scheduled_for >= ${rangeStart} AND task.scheduled_for < ${rangeEnd}`],
      ['treatment-tasks-completed', Prisma.sql`SELECT count(*) FROM treatment_tasks AS task JOIN treatment_plans AS plan ON plan.id = task.treatment_plan_id WHERE plan.clinic_id = ${clinicId}::uuid AND task.state = 'COMPLETED' AND task.completed_at >= ${rangeStart} AND task.completed_at < ${rangeEnd}`],
      ['treatment-completion-cohort', Prisma.sql`SELECT count(*) FROM treatment_tasks AS task JOIN treatment_plans AS plan ON plan.id = task.treatment_plan_id WHERE plan.clinic_id = ${clinicId}::uuid AND task.state IN ('SCHEDULED', 'COMPLETED') AND task.scheduled_for >= ${rangeStart} AND task.scheduled_for < ${rangeEnd}`],
      ['commerce-verified-payments', Prisma.sql`SELECT commerce_amount_toman, verified_at FROM payments AS payment JOIN commerce_orders AS orders ON orders.id = payment.order_id WHERE orders.clinic_id = ${clinicId}::uuid AND payment.verified_at >= ${rangeStart} AND payment.verified_at < ${rangeEnd}`],
      ['commerce-completed-refunds', Prisma.sql`SELECT amount_toman, completed_at FROM refunds AS refund JOIN payments AS payment ON payment.id = refund.payment_id JOIN commerce_orders AS orders ON orders.id = payment.order_id WHERE orders.clinic_id = ${clinicId}::uuid AND refund.status = 'COMPLETED' AND refund.completed_at >= ${rangeStart} AND refund.completed_at < ${rangeEnd}`],
      ['commerce-pending-refunds', Prisma.sql`SELECT count(*) FROM refunds AS refund JOIN payments AS payment ON payment.id = refund.payment_id JOIN commerce_orders AS orders ON orders.id = payment.order_id WHERE orders.clinic_id = ${clinicId}::uuid AND refund.status IN ('REQUESTED', 'APPROVED')`],
    ];

    const initial = await Promise.all(statements.map(([name, statement]) => explain(name, statement)));
    const replay = await Promise.all(statements.map(([name, statement]) => explain(name, statement)));
    expect(replay.map(({ name, nodeType, hasClinicScope }) => ({ name, nodeType, hasClinicScope }))).toEqual(initial.map(({ name, nodeType, hasClinicScope }) => ({ name, nodeType, hasClinicScope })));
    console.info(`F11-T05 scoped report query plans: ${JSON.stringify(initial)}`);
  }, 60_000);
});
