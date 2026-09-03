import { randomUUID } from 'node:crypto';

import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApiApplication } from '../src/app.factory';
import { ClinicalNotesService } from '../src/modules/clinical/clinical-notes.service';
import { PrismaService } from '../src/database/prisma/prisma.service';

describe('clinical note revisions (PostgreSQL integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let notes: ClinicalNotesService;
  const userIds = new Set<string>();

  beforeAll(async () => {
    app = await createApiApplication();
    await app.init();
    prisma = app.get(PrismaService);
    notes = app.get(ClinicalNotesService);
  }, 30_000);

  afterEach(async () => {
    if (!userIds.size) return;
    const users = [...userIds];
    await prisma.clinicalNoteRevision.deleteMany({ where: { clinicalNote: { encounter: { appointment: { idempotencyActorUserId: { in: users } } } } } });
    await prisma.clinicalNote.deleteMany({ where: { encounter: { appointment: { idempotencyActorUserId: { in: users } } } } });
    await prisma.encounter.deleteMany({ where: { appointment: { idempotencyActorUserId: { in: users } } } });
    await prisma.appointment.deleteMany({ where: { idempotencyActorUserId: { in: users } } });
    await prisma.patientProfile.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    userIds.clear();
  });

  afterAll(async () => { await app.close(); });

  const fixture = async () => {
    const clinic = await prisma.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' } });
    const offering = await prisma.doctorService.findFirstOrThrow({ where: { clinicId: clinic.id, isActive: true, publicationStatus: 'PUBLISHED' } });
    const patientUser = await prisma.user.create({ data: { phone: `+989${Math.floor(Math.random() * 900_000_000 + 100_000_000)}` } });
    const clinician = await prisma.user.create({ data: { phone: `+989${Math.floor(Math.random() * 900_000_000 + 100_000_000)}` } });
    userIds.add(patientUser.id); userIds.add(clinician.id);
    const patient = await prisma.patientProfile.create({ data: { userId: patientUser.id, clinicId: clinic.id } });
    const appointment = await prisma.appointment.create({ data: { clinicId: clinic.id, patientId: patient.id, doctorServiceId: offering.id, doctorId: offering.doctorId, startsAt: new Date(Date.now() - 30 * 60_000), endsAt: new Date(Date.now() + 30 * 60_000), status: 'IN_PROGRESS', startedAt: new Date(), priceAmount: offering.priceAmount, currency: offering.currency, priceCapturedAt: new Date(), idempotencyActorUserId: clinician.id, idempotencyKey: randomUUID(), idempotencyRequestHash: randomUUID().replaceAll('-', '').repeat(2) } });
    const encounter = await prisma.encounter.create({ data: { clinicId: clinic.id, appointmentId: appointment.id, patientId: patient.id, doctorId: offering.doctorId, startedByUserId: clinician.id } });
    return { encounter, clinician };
  };

  it('keeps private note history append-only, detects stale saves, and signs exact revisions', async () => {
    const { encounter, clinician } = await fixture();
    const created = await notes.create(encounter.id, { expectedRevision: 0, content: 'Initial private clinical observation.' }, clinician.id);
    expect(created).toMatchObject({ encounterId: encounter.id, currentRevision: 1, currentEffectiveRevision: 1, latestSignedRevision: null, revision: { revisionNumber: 1, state: 'DRAFT', isPrivate: true, content: 'Initial private clinical observation.', authoredByUserId: clinician.id, authoredAt: expect.any(Date) } });

    const saves = await Promise.allSettled([
      notes.save(created.id, { expectedRevision: 1, content: 'Updated private clinical observation.' }, clinician.id),
      notes.save(created.id, { expectedRevision: 1, content: 'Competing private clinical observation.' }, clinician.id),
    ]);
    expect(saves.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = saves.find((result): result is PromiseRejectedResult => result.status === 'rejected');
    expect(rejected?.reason).toMatchObject({ response: { code: 'CLINICAL_NOTE_REVISION_CONFLICT', details: { currentRevision: 2 } } });
    const saved = saves.find((result): result is PromiseFulfilledResult<Awaited<ReturnType<ClinicalNotesService['save']>>> => result.status === 'fulfilled')!.value;
    expect(saved).toMatchObject({ currentRevision: 2, currentEffectiveRevision: 2, revision: { revisionNumber: 2, previousRevisionId: created.revision.id, state: 'DRAFT', isPrivate: true } });
    await expect(notes.save(created.id, { expectedRevision: 1, content: 'Stale save.' }, clinician.id)).rejects.toMatchObject({ response: { code: 'CLINICAL_NOTE_REVISION_CONFLICT', details: { currentRevision: 2 } } });

    const signed = await notes.sign(created.id, 2, 2, clinician.id);
    expect(signed).toMatchObject({ currentRevision: 2, latestSignedRevision: 2, revision: { id: saved.revision.id, revisionNumber: 2, state: 'SIGNED', signedByUserId: clinician.id, signedAt: expect.any(Date), integrityHash: expect.stringMatching(/^[a-f0-9]{64}$/) } });
    const repeatedSign = await notes.sign(created.id, 2, 2, clinician.id);
    expect(repeatedSign.revision).toMatchObject({ id: saved.revision.id, state: 'SIGNED', integrityHash: signed.revision.integrityHash });

    await expect(notes.save(created.id, { expectedRevision: 2, content: 'Unexplained signed edit.' }, clinician.id)).rejects.toMatchObject({ response: { code: 'CLINICAL_NOTE_AMENDMENT_REASON_REQUIRED' } });
    const amended = await notes.save(created.id, { expectedRevision: 2, content: 'Corrected private clinical observation.', amendmentReasonCategory: 'CLINICAL_CORRECTION' }, clinician.id);
    expect(amended).toMatchObject({ currentRevision: 3, currentEffectiveRevision: 3, latestSignedRevision: 2, revision: { revisionNumber: 3, previousRevisionId: saved.revision.id, state: 'DRAFT', isPrivate: true, amendmentReasonCategory: 'CLINICAL_CORRECTION' } });

    const revisions = await prisma.clinicalNoteRevision.findMany({ where: { clinicalNoteId: created.id }, orderBy: { revisionNumber: 'asc' } });
    expect(revisions).toHaveLength(3);
    expect(revisions[1]).toMatchObject({ id: saved.revision.id, state: 'SIGNED', content: 'Updated private clinical observation.', signedByUserId: clinician.id, integrityHash: signed.revision.integrityHash });
    expect(revisions[2]).toMatchObject({ state: 'DRAFT', content: 'Corrected private clinical observation.', isPrivate: true });
  });
});
