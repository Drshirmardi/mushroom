import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';

import { AuthorizationGuard } from '../src/common/auth/authorization.guard';
import { AdminAssessmentSubmissionsController } from '../src/modules/assessments/admin/admin-assessment-submissions.controller';
import { AdminAssessmentSubmissionsService } from '../src/modules/assessments/admin/admin-assessment-submissions.service';

const contextFor = (handler: Function, roles: string[]): ExecutionContext => ({
  getHandler: () => handler,
  getClass: () => AdminAssessmentSubmissionsController,
  switchToHttp: () => ({ getRequest: () => ({ auth: { roles } }) }),
} as unknown as ExecutionContext);

const auditContext = { actorUserId: '00000000-0000-4000-8000-000000000001', actorSessionId: '00000000-0000-4000-8000-000000000002', requestId: 'request', ipAddress: '127.0.0.1' };
const patientId = '00000000-0000-4000-8000-000000000003';
const clinicId = '00000000-0000-4000-8000-000000000004';

describe('Admin assessment submissions authorization contract', () => {
  const guard = new AuthorizationGuard(new Reflector());

  it('allows ADMIN and rejects PATIENT for submission list and result reads', () => {
    for (const handler of [AdminAssessmentSubmissionsController.prototype.list, AdminAssessmentSubmissionsController.prototype.get]) {
      expect(guard.canActivate(contextFor(handler, ['ADMIN']))).toBe(true);
      expect(() => guard.canActivate(contextFor(handler, ['PATIENT']))).toThrow(/Insufficient permissions/);
    }
  });

  it('always scopes a patient filter to the active clinic and audits the read', async () => {
    let where: unknown;
    const auditEvents: unknown[] = [];
    const row = { id: '00000000-0000-4000-8000-000000000005', patientId, assessmentVersionId: '00000000-0000-4000-8000-000000000006', attemptNumber: 2, state: 'COMPLETE', score: { toString: () => '14.50' }, resultSnapshot: { snapshotVersion: 1, resultBand: 'LOW' }, startedAt: new Date('2026-08-25T08:00:00.000Z'), completedAt: new Date('2026-08-25T08:05:00.000Z'), assessmentVersion: { title: 'ارزیابی اصلی' } };
    const service = new AdminAssessmentSubmissionsService({
      clinic: { findFirst: async () => ({ id: clinicId }) },
      patientAssessmentSubmission: {
        count: async (value: { where: unknown }) => { where = value.where; return 1; },
        findMany: async () => [row],
      },
      $transaction: async (operations: Promise<unknown>[]) => Promise.all(operations),
      auditEvent: { create: async (value: unknown) => { auditEvents.push(value); } },
    } as never);

    await expect(service.list({ patientId, page: 1, pageSize: 20 }, auditContext)).resolves.toMatchObject({ total: 1, items: [{ id: row.id, patientId, score: '14.50' }] });
    expect(where).toMatchObject({ patientId, patient: { clinicId } });
    expect(auditEvents).toHaveLength(1);
    expect(auditEvents[0]).toMatchObject({ data: { action: 'ADMIN_ASSESSMENT_SUBMISSION_READ', subjectId: clinicId, metadata: { kind: 'LIST', total: 1 } } });
  });

  it('does not reveal a submission outside the active clinic or audit that failed read', async () => {
    let audits = 0;
    const service = new AdminAssessmentSubmissionsService({
      clinic: { findFirst: async () => ({ id: clinicId }) },
      patientAssessmentSubmission: { findFirst: async () => null },
      auditEvent: { create: async () => { audits += 1; } },
    } as never);

    await expect(service.get('00000000-0000-4000-8000-000000000005', auditContext)).rejects.toMatchObject({ response: { code: 'ASSESSMENT_SUBMISSION_NOT_FOUND' } });
    expect(audits).toBe(0);
  });
});
