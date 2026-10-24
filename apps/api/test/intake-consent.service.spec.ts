import { describe, expect, it, vi } from 'vitest';

import { PatientIntakeService } from '../src/modules/patients/intake/patient-intake.service';

const audit = {
  requestId: 'request-1',
  ipAddress: '127.0.0.1',
  actorUserId: '11111111-1111-4111-8111-111111111111',
  actorSessionId: '22222222-2222-4222-8222-222222222222',
};

const patient = {
  id: '33333333-3333-4333-8333-333333333333',
  clinicId: '44444444-4444-4444-8444-444444444444',
};

describe('PatientIntakeService', () => {
  it('canonicalizes declaration text before computing a draft snapshot', () => {
    const service = new PatientIntakeService({} as never);
    const snapshot = (service as unknown as { canonicalSnapshot(value: unknown): Record<string, unknown> })
      .canonicalSnapshot({
        birthDate: '۱۹۹۰-۰۱-۰۲',
        allergyReport: { status: 'PRESENT', items: ['  حساسیت  '] },
      });

    expect((snapshot.birthDate as Date).toISOString()).toBe('1990-01-02T00:00:00.000Z');
    expect(snapshot.allergyReport).toEqual({ status: 'PRESENT', items: ['حساسیت'] });
  });

  it('replays the same accepted consent idempotency key without a second write', async () => {
    const consent = {
      id: '55555555-5555-4555-8555-555555555555',
      patientId: patient.id,
      policyVersionId: '66666666-6666-4666-8666-666666666666',
      contentHash: 'a'.repeat(64),
      acceptedAt: new Date('2026-01-01T00:00:00.000Z'),
      withdrawnAt: null,
    };
    const create = vi.fn();
    const tx = {
      $queryRaw: vi.fn(),
      patientProfile: { findUnique: vi.fn().mockResolvedValue(patient) },
      consentPolicyVersion: { findFirst: vi.fn().mockResolvedValue({ id: consent.policyVersionId, contentHash: consent.contentHash }) },
      patientConsentRecord: { findFirst: vi.fn().mockResolvedValue(consent), create },
    };
    const prisma = { $transaction: (work: (value: typeof tx) => unknown) => work(tx) };
    const service = new PatientIntakeService(prisma as never);

    await expect(service.accept(audit.actorUserId, {
      policyVersionId: consent.policyVersionId,
      contentHash: consent.contentHash,
    }, 'accept-1', audit)).resolves.toMatchObject({ id: consent.id });
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects a withdrawal key reused against a different owned consent record', async () => {
    const priorWithdrawal = {
      id: '55555555-5555-4555-8555-555555555555',
      policyVersionId: '66666666-6666-4666-8666-666666666666',
      contentHash: 'a'.repeat(64),
      acceptedAt: new Date('2026-01-01T00:00:00.000Z'),
      withdrawnAt: new Date('2026-01-02T00:00:00.000Z'),
    };
    const tx = {
      $queryRaw: vi.fn(),
      patientProfile: { findUnique: vi.fn().mockResolvedValue(patient) },
      consentPolicyVersion: { findFirst: vi.fn() },
      patientConsentRecord: { findFirst: vi.fn().mockResolvedValue(priorWithdrawal) },
    };
    const prisma = { $transaction: (work: (value: typeof tx) => unknown) => work(tx) };
    const service = new PatientIntakeService(prisma as never);

    await expect(service.withdraw(
      audit.actorUserId,
      '77777777-7777-4777-8777-777777777777',
      'withdraw-1',
      audit,
    )).rejects.toMatchObject({
      response: { code: 'IDEMPOTENCY_KEY_REUSED' },
    });
  });

  it('replays COMPLETE only for the exact expected revision and rejects a changed payload', async () => {
    const consent = {
      id: '55555555-5555-4555-8555-555555555555',
      policyVersionId: '66666666-6666-4666-8666-666666666666',
    };
    const completedRevision = {
      id: '77777777-7777-4777-8777-777777777777',
      revisionNumber: 4,
      birthDate: new Date('1990-01-01T00:00:00.000Z'),
      sexAtBirth: 'FEMALE',
      heightCm: null,
      weightKg: null,
      bloodType: null,
      allergyReport: { status: 'NONE', items: [] },
      chronicConditionReport: { status: 'NONE', items: [] },
      currentMedicationReport: { status: 'NONE', items: [] },
      sleepDurationBand: null,
      exerciseFrequency: null,
      stressLevel: null,
      tobaccoUse: null,
    };
    const intake = {
      id: '88888888-8888-4888-8888-888888888888',
      submissionState: 'COMPLETE',
      currentRevisionNumber: 4,
      completedRevisionNumber: 4,
      revisions: [completedRevision],
    };
    const tx = {
      $queryRaw: vi.fn(),
      patientProfile: { findUnique: vi.fn().mockResolvedValue(patient) },
      consentPolicyVersion: { findFirst: vi.fn().mockResolvedValue({ id: consent.policyVersionId }) },
      patientConsentRecord: { findFirst: vi.fn().mockResolvedValue(consent) },
      patientMedicalIntake: { findUnique: vi.fn().mockResolvedValue(intake) },
      patientMedicalIntakeRevision: { findFirst: vi.fn().mockResolvedValue(completedRevision) },
    };
    const prisma = { $transaction: (work: (value: typeof tx) => unknown) => work(tx) };
    const service = new PatientIntakeService(prisma as never);

    await expect(service.complete(audit.actorUserId, { expectedRevision: 3 }, 'complete-1', audit))
      .resolves.toMatchObject({ currentRevision: 4, completedRevision: 4 });
    await expect(service.complete(audit.actorUserId, { expectedRevision: 2 }, 'complete-1', audit))
      .rejects.toMatchObject({ response: { code: 'IDEMPOTENCY_KEY_REUSED' } });
  });
});
