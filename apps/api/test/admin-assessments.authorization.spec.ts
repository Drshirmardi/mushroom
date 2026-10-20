import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';

import { AuthorizationGuard } from '../src/common/auth/authorization.guard';
import { AdminAssessmentsController } from '../src/modules/assessments/admin/admin-assessments.controller';
import { AdminAssessmentsService } from '../src/modules/assessments/admin/admin-assessments.service';

const contextFor = (handler: Function, roles: string[]): ExecutionContext => ({
  getHandler: () => handler,
  getClass: () => AdminAssessmentsController,
  switchToHttp: () => ({ getRequest: () => ({ auth: { roles } }) }),
} as unknown as ExecutionContext);

// Terminal/compatibility checks only; actual transaction/race/rollback proof uses PostgreSQL.
const transactionalService = (db: object) => new AdminAssessmentsService({ ...db,
  $transaction: async (run: (tx: unknown) => unknown) => run({ ...db, $queryRaw: async () => [{ id: 'owned' }], $executeRaw: async () => 0 }),
} as never);

describe('Admin assessment authorization and lifecycle contract', () => {
  const guard = new AuthorizationGuard(new Reflector());
  const handlers = [
    AdminAssessmentsController.prototype.list,
    AdminAssessmentsController.prototype.get,
    AdminAssessmentsController.prototype.create,
    AdminAssessmentsController.prototype.update,
    AdminAssessmentsController.prototype.remove,
    AdminAssessmentsController.prototype.duplicate,
    AdminAssessmentsController.prototype.publish,
    AdminAssessmentsController.prototype.archive,
  ];

  it('allows only ADMIN roles to manage assessment versions', () => {
    for (const handler of handlers) {
      expect(guard.canActivate(contextFor(handler, ['ADMIN']))).toBe(true);
      expect(() => guard.canActivate(contextFor(handler, ['PATIENT']))).toThrow(/Insufficient permissions/);
    }
  });

  it('rejects malformed structures before writing a draft', async () => {
    const service = new AdminAssessmentsService({ clinic: { findFirst: async () => ({ id: '00000000-0000-4000-8000-000000000002' }) } } as never);
    await expect(service.create({ assessmentKey: 'MAIN', locale: 'fa-IR', title: 'فرم', structure: { schemaVersion: 1, sections: [{ id: 'same', questions: [{ id: 'same' }] }] } }, {} as never)).rejects.toMatchObject({ response: { code: 'ASSESSMENT_STRUCTURE_INVALID' } });
  });

  it('duplicates into a distinct draft identity while retaining the canonical content hash', async () => {
    const source = { id: '00000000-0000-4000-8000-000000000001', clinicId: '00000000-0000-4000-8000-000000000002', assessmentKey: 'MAIN', locale: 'fa-IR', versionNumber: 1, title: 'فرم', structure: { schemaVersion: 1, sections: [] }, contentHash: 'a'.repeat(64), status: 'PUBLISHED', publishedAt: new Date(), retiredAt: null, publishedByUserId: '00000000-0000-4000-8000-000000000003', createdAt: new Date(), updatedAt: new Date() };
    const created = { ...source, id: '00000000-0000-4000-8000-000000000004', versionNumber: 2, status: 'DRAFT', publishedAt: null, publishedByUserId: null };
    const service = transactionalService({ clinic: { findFirst: async () => ({ id: source.clinicId }) }, assessmentVersion: { findFirst: async () => source, aggregate: async () => ({ _max: { versionNumber: 1 } }), create: async () => created }, auditEvent: { create: async () => undefined } });
    const result = await service.duplicate(source.id, { actorUserId: source.publishedByUserId!, actorSessionId: '00000000-0000-4000-8000-000000000005', requestId: 'request', ipAddress: '127.0.0.1' });
    expect(result).toMatchObject({ id: created.id, status: 'DRAFT', versionNumber: 2, contentHash: source.contentHash });
    expect(result.id).not.toBe(source.id);
  });

  it('makes publishing an already published version idempotent without a write', async () => {
    const version = { id: '00000000-0000-4000-8000-000000000001', clinicId: '00000000-0000-4000-8000-000000000002', assessmentKey: 'MAIN', locale: 'fa-IR', versionNumber: 1, title: 'فرم', structure: { schemaVersion: 1, sections: [] }, contentHash: 'a'.repeat(64), status: 'PUBLISHED', publishedAt: new Date(), retiredAt: null, publishedByUserId: '00000000-0000-4000-8000-000000000003', createdAt: new Date(), updatedAt: new Date() };
    let writes = 0;
    const service = transactionalService({ clinic: { findFirst: async () => ({ id: version.clinicId }) }, assessmentVersion: { findFirst: async () => version, update: async () => { writes += 1; return version; } } });
    await expect(service.publish(version.id, { actorUserId: version.publishedByUserId!, actorSessionId: '00000000-0000-4000-8000-000000000005', requestId: 'request', ipAddress: '127.0.0.1' })).resolves.toMatchObject({ status: 'PUBLISHED' });
    expect(writes).toBe(0);
  });

  it('rejects changes to a published version before writing', async () => {
    const version = { id: '00000000-0000-4000-8000-000000000001', clinicId: '00000000-0000-4000-8000-000000000002', assessmentKey: 'MAIN', locale: 'fa-IR', versionNumber: 1, title: 'فرم', structure: { schemaVersion: 1, sections: [] }, contentHash: 'a'.repeat(64), status: 'PUBLISHED', publishedAt: new Date(), retiredAt: null, publishedByUserId: '00000000-0000-4000-8000-000000000003', createdAt: new Date(), updatedAt: new Date() };
    let writes = 0;
    const service = transactionalService({ clinic: { findFirst: async () => ({ id: version.clinicId }) }, assessmentVersion: { findFirst: async () => version, update: async () => { writes += 1; return version; } } });
    await expect(service.update(version.id, { title: 'نسخهٔ ویرایش‌شده' }, {} as never)).rejects.toMatchObject({ response: { code: 'ASSESSMENT_VERSION_IMMUTABLE' } });
    expect(writes).toBe(0);
  });
});
