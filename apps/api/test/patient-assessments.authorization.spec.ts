import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { AuthorizationGuard } from '../src/common/auth/authorization.guard';
import { PatientAssessmentsController } from '../src/modules/assessments/patient/patient-assessments.controller';
import { PatientAssessmentsService } from '../src/modules/assessments/patient/patient-assessments.service';

const contextFor = (handler: Function, roles: string[]): ExecutionContext => ({ getHandler: () => handler, getClass: () => PatientAssessmentsController, switchToHttp: () => ({ getRequest: () => ({ auth: { roles } }) }) } as unknown as ExecutionContext);
const patientId = '00000000-0000-4000-8000-000000000001';
const auditContext = { actorUserId: 'user', actorSessionId: 'session', requestId: 'request', ipAddress: '127.0.0.1' };
// Only terminal/authorization branches are mocked here; mutation/race/rollback proof is real PostgreSQL.
const transactionalService = (findFirst: () => Promise<unknown>) => {
  const tx = {
    patientProfile: { findUnique: async () => ({ id: patientId, clinicId: '00000000-0000-4000-8000-000000000002' }) },
    patientAssessmentSubmission: { findFirst }, auditEvent: { create: async () => ({}) },
    $queryRaw: async () => [{ id: 'owned' }], $executeRaw: async () => 0,
  };
  return new PatientAssessmentsService({ $transaction: async (run: (client: unknown) => unknown) => run(tx) } as never);
};

describe('Patient assessment draft contract', () => {
  it('allows PATIENT and rejects ADMIN for patient assessment routes', () => { const guard = new AuthorizationGuard(new Reflector()); for (const handler of [PatientAssessmentsController.prototype.list, PatientAssessmentsController.prototype.start, PatientAssessmentsController.prototype.get, PatientAssessmentsController.prototype.save, PatientAssessmentsController.prototype.submit, PatientAssessmentsController.prototype.result]) { expect(guard.canActivate(contextFor(handler, ['PATIENT']))).toBe(true); expect(() => guard.canActivate(contextFor(handler, ['ADMIN']))).toThrow(/Insufficient permissions/); } });
  it('never saves a completed submission', async () => { const service = transactionalService(async () => ({ id: '00000000-0000-4000-8000-000000000003', state: 'COMPLETE' })); await expect(service.save('00000000-0000-4000-8000-000000000003', { q1: 'answer' }, 'user', auditContext)).rejects.toMatchObject({ response: { code: 'ASSESSMENT_SUBMISSION_IMMUTABLE' } }); });
  it('does not reveal another patient submission', async () => { const service = transactionalService(async () => null); await expect(service.get('00000000-0000-4000-8000-000000000003', 'user', auditContext)).rejects.toMatchObject({ response: { code: 'ASSESSMENT_SUBMISSION_NOT_FOUND' } }); });
  it('replays only the identical idempotent completion request', async () => { const answers = { q1: 'answer' }; const completed = { id: '00000000-0000-4000-8000-000000000003', assessmentVersionId: '00000000-0000-4000-8000-000000000004', attemptNumber: 1, revision: 2, state: 'COMPLETE', answers, resultSnapshot: { snapshotVersion: 1 }, score: null, startedAt: new Date(), completedAt: new Date(), completionIdempotencyKey: 'same-key', completionPayloadHash: '' }; const service = transactionalService(async () => completed); const hash = (service as never as { hash(value: unknown): string }).hash(answers); completed.completionPayloadHash = hash; await expect(service.submit(completed.id, 'same-key', 'user', auditContext)).resolves.toMatchObject({ state: 'COMPLETE' }); await expect(service.submit(completed.id, 'other-key', 'user', auditContext)).rejects.toMatchObject({ response: { code: 'ASSESSMENT_SUBMISSION_IMMUTABLE' } }); });
  it('rejects reuse of an idempotency key for different saved answers', async () => { let lookups = 0; const service = transactionalService(async () => ++lookups === 1 ? { id: 'submission', state: 'IN_PROGRESS', answers: { q1: 'new' }, assessmentVersion: { structure: {} } } : { id: 'other-submission', state: 'COMPLETE', completionPayloadHash: 'different-payload' }); await expect(service.submit('submission', 'same-key', 'user', auditContext)).rejects.toMatchObject({ response: { code: 'IDEMPOTENCY_KEY_REUSED' } }); });
});
