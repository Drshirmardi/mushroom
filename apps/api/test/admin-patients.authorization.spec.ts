import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';

import { AuthorizationGuard } from '../src/common/auth/authorization.guard';
import { AdminPatientsController } from '../src/modules/patients/admin/admin-patients.controller';
import { AdminPatientsService } from '../src/modules/patients/admin/admin-patients.service';

const contextFor = (handler: Function, roles: string[]): ExecutionContext => ({
  getHandler: () => handler,
  getClass: () => AdminPatientsController,
  switchToHttp: () => ({ getRequest: () => ({ auth: { roles } }) }),
} as unknown as ExecutionContext);

describe('Admin patients authorization contract', () => {
  const guard = new AuthorizationGuard(new Reflector());
  const handlers = [
    AdminPatientsController.prototype.list,
    AdminPatientsController.prototype.summary,
    AdminPatientsController.prototype.get,
    AdminPatientsController.prototype.create,
    AdminPatientsController.prototype.update,
    AdminPatientsController.prototype.correct,
  ];

  it('allows ADMIN and rejects PATIENT for every admin patient action', () => {
    for (const handler of handlers) {
      expect(guard.canActivate(contextFor(handler, ['ADMIN']))).toBe(true);
      expect(() => guard.canActivate(contextFor(handler, ['PATIENT']))).toThrow(/Insufficient permissions/);
    }
  });
});

describe('Admin intake correction idempotency contract', () => {
  const body = { expectedRevision: 3, correctionReason: '  تایپ  اشتباه ', tobaccoUse: 'NEVER' as const };
  const context = { actorUserId: '00000000-0000-4000-8000-000000000001', actorSessionId: '00000000-0000-4000-8000-000000000002', requestId: 'request', ipAddress: '127.0.0.1' };

  const serviceForReplay = (payloadHash: string) => {
    const revision = { intakeId: '00000000-0000-4000-8000-000000000011', revisionNumber: 4, revisionState: 'DRAFT', birthDate: null, sexAtBirth: null, heightCm: null, weightKg: null, bloodType: null, allergyReport: null, chronicConditionReport: null, currentMedicationReport: null, sleepDurationBand: null, exerciseFrequency: null, stressLevel: null, tobaccoUse: 'NEVER', recordingMode: 'ADMIN_ON_BEHALF_CORRECTION', payloadHash };
    const tx = {
      patientProfile: { findUnique: async () => ({ id: '00000000-0000-4000-8000-000000000010', clinicId: '00000000-0000-4000-8000-000000000012', medicalIntake: { id: revision.intakeId, currentRevisionNumber: 4, revisions: [revision] } }) },
      consentPolicyVersion: { findFirst: async () => ({ id: '00000000-0000-4000-8000-000000000013' }) },
      patientConsentRecord: { findFirst: async () => ({ id: '00000000-0000-4000-8000-000000000014' }) },
      patientMedicalIntakeRevision: { findFirst: async () => revision },
    };
    return new AdminPatientsService({ $transaction: async (callback: (value: typeof tx) => unknown) => callback(tx) } as never);
  };

  it('replays only an identical canonical correction operation', async () => {
    const probe = serviceForReplay('unused');
    const patch = (probe as never as { correctionPatch(value: typeof body): Record<string, unknown> }).correctionPatch(body);
    const hash = (probe as never as { correctionOperationHash(revision: number, reason: string, value: Record<string, unknown>): string }).correctionOperationHash(3, 'تایپ اشتباه', patch);
    const service = serviceForReplay(hash);

    await expect(service.correctIntake('00000000-0000-4000-8000-000000000010', body, 'same-key', context)).resolves.toMatchObject({ revisionNumber: 4 });
    await expect(service.correctIntake('00000000-0000-4000-8000-000000000010', { ...body, tobaccoUse: 'CURRENT' }, 'same-key', context)).rejects.toMatchObject({ response: { code: 'IDEMPOTENCY_KEY_REUSED' } });
  });

  it('rejects a whitespace-only correction reason before a database operation', async () => {
    const service = new AdminPatientsService({ $transaction: () => { throw new Error('database must not be called'); } } as never);
    await expect(service.correctIntake('00000000-0000-4000-8000-000000000010', { ...body, correctionReason: '   ' }, 'new-key', context)).rejects.toMatchObject({ status: 422, response: { code: 'INVALID_MEDICAL_DECLARATION' } });
  });
});
