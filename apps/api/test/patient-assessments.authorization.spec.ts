import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { AuthorizationGuard } from '../src/common/auth/authorization.guard';
import { PatientAssessmentsController } from '../src/modules/assessments/patient/patient-assessments.controller';
import { PatientAssessmentsService } from '../src/modules/assessments/patient/patient-assessments.service';

const contextFor = (handler: Function, roles: string[]): ExecutionContext => ({ getHandler: () => handler, getClass: () => PatientAssessmentsController, switchToHttp: () => ({ getRequest: () => ({ auth: { roles } }) }) } as unknown as ExecutionContext);
const patientId = '00000000-0000-4000-8000-000000000001';

describe('Patient assessment draft contract', () => {
  it('allows PATIENT and rejects ADMIN for patient assessment routes', () => { const guard = new AuthorizationGuard(new Reflector()); for (const handler of [PatientAssessmentsController.prototype.list, PatientAssessmentsController.prototype.start, PatientAssessmentsController.prototype.get, PatientAssessmentsController.prototype.save]) { expect(guard.canActivate(contextFor(handler, ['PATIENT']))).toBe(true); expect(() => guard.canActivate(contextFor(handler, ['ADMIN']))).toThrow(/Insufficient permissions/); } });
  it('never saves a completed submission', async () => { const service = new PatientAssessmentsService({ patientProfile: { findUnique: async () => ({ id: patientId, clinicId: '00000000-0000-4000-8000-000000000002' }) }, patientAssessmentSubmission: { findFirst: async () => ({ id: '00000000-0000-4000-8000-000000000003', state: 'COMPLETE' }) } } as never); await expect(service.save('00000000-0000-4000-8000-000000000003', { q1: 'answer' }, 'user', { actorUserId: 'user', actorSessionId: 'session', requestId: 'request', ipAddress: '127.0.0.1' })).rejects.toMatchObject({ response: { code: 'ASSESSMENT_SUBMISSION_IMMUTABLE' } }); });
  it('does not reveal another patient submission', async () => { const service = new PatientAssessmentsService({ patientProfile: { findUnique: async () => ({ id: patientId, clinicId: '00000000-0000-4000-8000-000000000002' }) }, patientAssessmentSubmission: { findFirst: async () => null } } as never); await expect(service.get('00000000-0000-4000-8000-000000000003', 'user')).rejects.toMatchObject({ response: { code: 'ASSESSMENT_SUBMISSION_NOT_FOUND' } }); });
});
