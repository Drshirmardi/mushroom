import { createCompleteTestPatient } from './patient-entry-test-support';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApiApplication } from '../src/app.factory';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { Prisma } from '../src/generated/prisma/client';
import { createTestAccessToken } from './auth-test-support';

describe.skipIf(process.env.PATIENT_JOURNEY_TEST_ISOLATED !== '1')('adult couple account links (isolated PostgreSQL)', () => {
  let app: NestFastifyApplication; let db: PrismaService; let clinicId: string; let policyId: string;
  type Actor = Awaited<ReturnType<typeof patient>>;
  beforeAll(async () => {
    const target = new URL(process.env.DATABASE_URL ?? '');
    if (!['127.0.0.1', 'localhost'].includes(target.hostname) || target.pathname !== '/patient_journey_test') throw new Error('Disposable patient_journey_test required.');
    Logger.overrideLogger(false); app = await createApiApplication(); await app.init(); db = app.get(PrismaService);
    clinicId = (await db.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' } })).id;
    const current = await db.consentPolicyVersion.findFirst({ where: { clinicId, policyKey: 'COUPLES_ACCOUNT_LINKING', locale: 'fa-IR', status: 'ACTIVE' } });
    if (current) await db.consentPolicyVersion.update({ where: { id: current.id }, data: { status: 'RETIRED', retiredAt: new Date() } });
  }, 30_000);
  afterAll(async () => { await app?.close(); });
  async function policy() {
    const versionNumber = (await db.consentPolicyVersion.aggregate({ where: { clinicId, policyKey: 'COUPLES_ACCOUNT_LINKING', locale: 'fa-IR' }, _max: { versionNumber: true } }))._max.versionNumber ?? 0;
    const body = 'Synthetic test-only account linking consent. Does not authorize medical processing or answer disclosure.';
    const record = await db.consentPolicyVersion.create({ data: { clinicId, policyKey: 'COUPLES_ACCOUNT_LINKING', locale: 'fa-IR', versionNumber: versionNumber + 1, title: 'Synthetic linking consent', body, contentHash: createHash('sha256').update(body).digest('hex'), status: 'ACTIVE', activatedAt: new Date() } }); policyId = record.id;
  }
  async function patient(birthDate: Date | null = new Date('1990-01-01T00:00:00Z'), otherClinic = clinicId) {
    const auth = await createTestAccessToken(db, app.get(AccessTokenService), ['PATIENT']);
    const profile = await createCompleteTestPatient(db, { data: { userId: auth.userId, clinicId: otherClinic } });
    if (birthDate) {
      const intake = await db.patientMedicalIntake.create({ data: { patientId: profile.id, clinicId: otherClinic, currentRevisionNumber: 1 } });
      await db.patientMedicalIntakeRevision.create({ data: { intakeId: intake.id, revisionNumber: 1, assignedSchemaVersion: 1, revisionState: 'DRAFT', birthDate,
        recordingMode: 'PATIENT_ENTRY', reportedPatientId: profile.id, payloadHash: 'a'.repeat(64) } });
    }
    const user = await db.user.findUniqueOrThrow({ where: { id: auth.userId }, select: { phone: true } });
    return { ...auth, patientId: profile.id, phone: user.phone };
  }
  const request = (p: { token: string }, method: 'GET' | 'POST', path: string, payload?: object, key = randomUUID()) => app.inject({ method, url: `/v1/patients/me/${path}`, headers: { authorization: `Bearer ${p.token}`, origin: 'http://localhost:3000', 'idempotency-key': key, ...(payload ? { 'content-type': 'application/json' } : {}) }, ...(payload ? { payload: JSON.stringify(payload) } : {}) });
  const consent = () => ({ consentPolicyVersionId: policyId, consentAccepted: true });
  async function session(p: Actor) { const response = await request(p, 'POST', 'couple-sessions', consent()); expect(response.statusCode, response.body).toBe(201); return response.json().id as string; }
  async function invite(p: Actor, id: string, recipient: Actor, key = randomUUID()) { const response = await request(p, 'POST', `couple-sessions/${id}/invitations`, { recipientPhone: recipient.phone, recipientPatientId: recipient.patientId }, key); expect(response.statusCode, response.body).toBe(201); return response.json() as { invitationId: string; invitationToken: string; expiresAt: null }; }
  const accept = (p: Actor, invitationToken: string) => request(p, 'POST', 'couple-invitations/accept', { ...consent(), invitationToken });

  it('fails closed without an owner-published linking policy, then uses synthetic test-only policy', async () => {
    const p = await patient(); const response = await request(p, 'GET', 'couple-link-policy'); expect(response.statusCode).toBe(503); expect(response.json().code).toBe('COUPLE_POLICY_UNAVAILABLE');
    await policy(); const ready = await request(p, 'GET', 'couple-link-policy'); expect(ready.statusCode).toBe(200); expect(ready.json()).toMatchObject({ id: policyId, policyKey: 'COUPLES_ACCOUNT_LINKING' });
  });
  it('requires explicit consent and blocks missing/under18 self-reported age', async () => {
    const today = new Date(new Date().toISOString().slice(0, 10));
    const eighteenthBirthday = new Date(Date.UTC(today.getUTCFullYear() - 18, today.getUTCMonth(), today.getUTCDate()));
    const younger = new Date(eighteenthBirthday.getTime() + 86400000);
    for (const p of [await patient(null), await patient(younger)]) { const response = await request(p, 'POST', 'couple-sessions', consent()); expect(response.statusCode).toBe(422); expect(response.json().code).toBe('COUPLE_PARTICIPANT_INELIGIBLE'); }
    const adult = await patient(eighteenthBirthday); expect((await request(adult, 'POST', 'couple-sessions', { ...consent(), consentAccepted: false })).statusCode).toBe(400); await session(adult);
  });
  it('creates a single initiator and replays parallel session creation once', async () => {
    const p = await patient(); const key = randomUUID(); const replies = await Promise.all(Array.from({ length: 8 }, () => request(p, 'POST', 'couple-sessions', consent(), key)));
    expect(replies.map(r => r.statusCode)).toEqual(Array(8).fill(201)); expect(new Set(replies.map(r => r.json().id)).size).toBe(1);
    const response = replies[0]; expect(response.json()).toMatchObject({ state: 'AWAITING_PARTNER', minimumAgeYears: 18, assessmentReady: false, participants: [{ slot: 'INITIATOR', isSelf: true, consentState: 'ACCEPTED' }] });
    expect(await db.coupleParticipant.count({ where: { sessionId: response.json().id } })).toBe(1);
    expect((await request(p, 'POST', 'couple-sessions', { ...consent(), consentPolicyVersionId: randomUUID() }, key)).statusCode).toBe(409);
  });
  it('binds a nonexpiring one-time secret to the registered recipient without storing phone/raw token', async () => {
    const p = await patient(), peer = await patient(); const id = await session(p); const key = randomUUID(); const issued = await invite(p, id, peer, key);
    expect(issued.invitationToken).toMatch(/^[A-Za-z0-9_-]{43}$/); expect(issued.expiresAt).toBeNull();
    const row = await db.coupleInvitation.findUniqueOrThrow({ where: { id: issued.invitationId } }); expect(row.tokenHash).toBe(createHash('sha256').update(issued.invitationToken).digest('hex'));
    expect(JSON.stringify(row)).not.toContain(peer.phone); expect(JSON.stringify(row)).not.toContain(issued.invitationToken);
    const replay = await invite(p, id, peer, key); expect(replay.invitationId).toBe(issued.invitationId); expect(replay.invitationToken).toBeNull();
    const preview = await request(peer, 'POST', 'couple-invitations/preview', { invitationToken: issued.invitationToken }); expect(preview.statusCode, preview.body).toBe(201);
    expect((await db.coupleInvitation.findUniqueOrThrow({ where: { id: issued.invitationId } })).status).toBe('PENDING'); expect(await db.coupleParticipant.count({ where: { sessionId: id } })).toBe(1);
    for (const text of [peer.phone, p.phone, peer.patientId, p.patientId, row.tokenHash]) expect(preview.body).not.toContain(text);
  });
  it('accepts only the intended independent account and never discloses partner private responses', async () => {
    const p = await patient(), peer = await patient(), other = await patient(); const id = await session(p); const invitation = await invite(p, id, peer);
    expect((await accept(p, invitation.invitationToken)).statusCode).toBe(404); expect((await accept(other, invitation.invitationToken)).statusCode).toBe(404);
    const linked = await accept(peer, invitation.invitationToken); expect(linked.statusCode, linked.body).toBe(201); expect(linked.json().state).toBe('LINKED'); expect(linked.json().participants).toHaveLength(2);
    expect(linked.json().participants.find((x: { isSelf: boolean }) => x.isSelf).slot).toBe('PARTNER');
    expect((await request(other, 'GET', `couple-sessions/${id}`)).statusCode).toBe(404);
    for (const text of [p.userId, peer.userId, p.patientId, peer.patientId, p.phone, peer.phone, 'birthDate', 'answers', 'resultSnapshot', 'tokenHash']) expect(linked.body).not.toContain(text);
    expect((await request(peer, 'GET', `couple-sessions/${id}`)).statusCode).toBe(200);
  });
  it('serializes concurrent recipient accept retries into one participant and consent', async () => {
    const p = await patient(), peer = await patient(); const id = await session(p); const invitation = await invite(p, id, peer);
    const replies = await Promise.all(Array.from({ length: 8 }, () => accept(peer, invitation.invitationToken)));
    expect(replies.map(r => r.statusCode)).toEqual(Array(8).fill(201)); expect(await db.coupleParticipant.count({ where: { sessionId: id } })).toBe(2);
    expect(await db.auditEvent.count({ where: { subjectId: invitation.invitationId, action: 'COUPLE_INVITATION_ACCEPTED' } })).toBe(1);
    const third = await patient(); expect((await request(p, 'POST', `couple-sessions/${id}/invitations`, { recipientPhone: third.phone, recipientPatientId: third.patientId })).statusCode).toBe(409);
  });
  it('returns an invitation secret only once across concurrent identical issuance retries', async () => {
    const p = await patient(), peer = await patient(); const id = await session(p); const key = randomUUID();
    const replies = await Promise.all(Array.from({ length: 8 }, () => request(p, 'POST', `couple-sessions/${id}/invitations`, { recipientPhone: peer.phone, recipientPatientId: peer.patientId }, key)));
    expect(replies.map(r => r.statusCode)).toEqual(Array(8).fill(201)); expect(new Set(replies.map(r => r.json().invitationId)).size).toBe(1);
    expect(replies.filter(r => r.json().invitationToken !== null)).toHaveLength(1); expect(await db.coupleInvitation.count({ where: { sessionId: id, status: 'PENDING' } })).toBe(1);
    const normalizedReplay = await request(p, 'POST', `couple-sessions/${id.toUpperCase()}/invitations`, { recipientPhone: peer.phone.replace(/^\+98/u, '0'), recipientPatientId: peer.patientId.toUpperCase() }, key);
    expect(normalizedReplay.statusCode).toBe(201); expect(normalizedReplay.json().invitationToken).toBeNull();
  });
  it('blocks an under18 recipient without adding a second participant', async () => {
    const p = await patient(), peer = await patient(new Date('2015-01-01T00:00:00Z')); const id = await session(p); const invitation = await invite(p, id, peer);
    expect((await accept(peer, invitation.invitationToken)).statusCode).toBe(422); expect(await db.coupleParticipant.count({ where: { sessionId: id } })).toBe(1);
  });
  it('deliberately replaces an earlier pending token and refuses self/unknown invitees', async () => {
    const p = await patient(), peer = await patient(); const id = await session(p); const first = await invite(p, id, peer); const replacement = await invite(p, id, peer);
    expect((await accept(peer, first.invitationToken)).statusCode).toBe(409); expect((await accept(peer, replacement.invitationToken)).statusCode).toBe(201);
    const other = await session(p);
    for (const phone of [p.phone, '+989001111111']) expect((await request(p, 'POST', `couple-sessions/${other}/invitations`, { recipientPhone: phone, recipientPatientId: p.patientId })).statusCode).toBe(422);
  });
  it('keeps an old invitation usable without a time-based deadline', async () => {
    const p = await patient(), peer = await patient(); const id = await session(p); const token = randomBytes(32).toString('base64url');
    await db.coupleInvitation.create({ data: { sessionId: id, clinicId, issuerPatientId: p.patientId, recipientPatientId: peer.patientId, tokenHash: createHash('sha256').update(token).digest('hex'), idempotencyKey: randomUUID(), payloadHash: 'a'.repeat(64), createdAt: new Date('2020-01-01T00:00:00Z') } });
    expect((await accept(peer, token)).statusCode).toBe(201);
  });
  it('withdraws own linking consent idempotently and revokes pending invitations without a financial mutation', async () => {
    const p = await patient(), peer = await patient(); const id = await session(p); const invitation = await invite(p, id, peer);
    const replies = await Promise.all([request(p, 'POST', `couple-sessions/${id}/consent-withdrawal`), request(p, 'POST', `couple-sessions/${id}/consent-withdrawal`)]);
    expect(replies.map(r => r.statusCode)).toEqual([201, 201]); expect(replies[0].json().state).toBe('CONSENT_REVOKED'); expect((await accept(peer, invitation.invitationToken)).statusCode).toBe(409);
    expect((await db.coupleInvitation.findUniqueOrThrow({ where: { id: invitation.invitationId } })).status).toBe('REVOKED');
    expect(await db.auditEvent.count({ where: { action: 'COUPLE_LINK_CONSENT_WITHDRAWN', actorUserId: p.userId } })).toBe(1);
    expect(await db.billingIntent.count({ where: { patientId: p.patientId } })).toBe(0);
  });
  it('requires the exact policy and conceals other clinic/session resources', async () => {
    const p = await patient(), peer = await patient(); const id = await session(p); const invitation = await invite(p, id, peer);
    expect((await request(peer, 'POST', 'couple-invitations/accept', { ...consent(), consentPolicyVersionId: randomUUID(), invitationToken: invitation.invitationToken })).statusCode).toBe(409);
    const clinic = await db.clinic.create({ data: { name: 'Synthetic other linking clinic', status: 'INACTIVE' } }); const other = await patient(new Date('1990-01-01T00:00:00Z'), clinic.id);
    expect((await request(other, 'GET', `couple-sessions/${id}`)).statusCode).toBe(404); expect((await request(other, 'POST', `couple-sessions/${id}/consent-withdrawal`)).statusCode).toBe(404);
    expect((await request(p, 'POST', `couple-sessions/${id}/invitations`, { recipientPhone: other.phone, recipientPatientId: other.patientId })).statusCode).toBe(422);
  });
  it('does not block privacy withdrawal when the wall clock moves behind the recorded acceptance', async () => {
    const p = await patient(); const policy = await db.consentPolicyVersion.findUniqueOrThrow({ where: { id: policyId } }); const futureGrant = new Date(Date.now() + 60_000);
    const id = await db.$transaction(async tx => {
      const row = await tx.coupleSession.create({ data: { clinicId, initiatorPatientId: p.patientId, consentPolicyVersionId: policyId, consentContentHash: policy.contentHash, idempotencyKey: randomUUID(), payloadHash: 'a'.repeat(64) } });
      await tx.coupleParticipant.create({ data: { sessionId: row.id, clinicId, patientId: p.patientId, slot: 'INITIATOR', consentPolicyVersionId: policyId, consentContentHash: policy.contentHash, acceptedByUserId: p.userId, acceptedSessionId: p.sessionId, acceptedAt: futureGrant } }); return row.id;
    });
    const response = await request(p, 'POST', `couple-sessions/${id}/consent-withdrawal`); expect(response.statusCode, response.body).toBe(201); expect(response.json().state).toBe('CONSENT_REVOKED');
    const row = await db.coupleParticipant.findUniqueOrThrow({ where: { sessionId_patientId: { sessionId: id, patientId: p.patientId } } }); expect(row.revokedAt!.getTime()).toBeGreaterThanOrEqual(futureGrant.getTime());
  });
  it('denies anonymous/other-role/invalid DTO and bounded-query access', async () => {
    expect((await app.inject({ method: 'GET', url: '/v1/patients/me/couple-sessions' })).statusCode).toBe(401);
    for (const role of ['ADMIN', 'DOCTOR', 'STAFF']) { const who = await createTestAccessToken(db, app.get(AccessTokenService), [role]); expect((await request(who, 'GET', 'couple-sessions')).statusCode).toBe(403); }
    const p = await patient();
    for (const path of ['couple-sessions?page=0', 'couple-sessions?pageSize=51', 'couple-sessions?patientId=another']) expect((await request(p, 'GET', path)).statusCode).toBe(400);
    expect((await request(p, 'POST', 'couple-invitations/accept', { ...consent(), invitationToken: 'bad' })).statusCode).toBe(400);
  });
  it('blocks shared use after acceptance and withdrawal race in either order', async () => {
    const p = await patient(), peer = await patient(); const id = await session(p); const issued = await invite(p, id, peer);
    const [accepted, withdrawn] = await Promise.all([accept(peer, issued.invitationToken), request(p, 'POST', `couple-sessions/${id}/consent-withdrawal`)]);
    expect([201, 409]).toContain(accepted.statusCode); expect(withdrawn.statusCode).toBe(201); expect((await db.coupleSession.findUniqueOrThrow({ where: { id } })).state).toBe('CONSENT_REVOKED');
    expect((await accept(peer, issued.invitationToken)).statusCode).toBe(409);
  });
  it('lists only owned links with bounded Journey summaries and no partner identity leakage', async () => {
    const p = await patient(), stranger = await patient(); for (let n = 0; n < 7; n++) await session(p); const foreignId = await session(stranger);
    const listed = await request(p, 'GET', 'couple-sessions?pageSize=2'); expect(listed.json().items).toHaveLength(2); expect(listed.json().total).toBe(7); expect(listed.body).not.toContain(foreignId);
    const home = await request(p, 'GET', 'journey'); expect(home.statusCode).toBe(200); expect(home.json().coupleLinks.items).toHaveLength(5); expect(home.json().coupleLinks.hasMore).toBe(true);
    expect(home.body).not.toContain(foreignId); expect(home.body).not.toContain(p.patientId); expect(home.json().coupleLinks.items.every((x: { assessmentReady: boolean }) => x.assessmentReady === false)).toBe(true);
  });
  it('fails closed and rolls back every changed operation when the required couple audit fails', async () => {
    const p = await patient(), peer = await patient(); const id = await session(p); const issued = await invite(p, id, peer); const withdrawalId = await session(p);
    if (![p.userId, peer.userId].every(id => /^[a-f0-9-]{36}$/.test(id))) throw new Error('Invalid synthetic UUID');
    await db.$executeRawUnsafe(`CREATE FUNCTION couple_test_audit_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.actor_user_id IN ('${p.userId}'::uuid, '${peer.userId}'::uuid) AND NEW.subject_type = 'COUPLE_ACCOUNT_LINK' THEN RAISE EXCEPTION 'synthetic audit failure'; END IF; RETURN NEW; END $$`);
    await db.$executeRaw(Prisma.sql`CREATE TRIGGER couple_test_audit_fail BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION couple_test_audit_fail()`);
    try {
      const before = await db.coupleSession.count({ where: { initiatorPatientId: p.patientId } });
      const cases = [
        [p, 'POST', 'couple-sessions', consent()], [p, 'POST', `couple-sessions/${id}/invitations`, { recipientPhone: peer.phone, recipientPatientId: peer.patientId }],
        [peer, 'POST', 'couple-invitations/preview', { invitationToken: issued.invitationToken }], [peer, 'POST', 'couple-invitations/accept', { ...consent(), invitationToken: issued.invitationToken }],
        [p, 'POST', `couple-sessions/${withdrawalId}/consent-withdrawal`, undefined], [p, 'GET', `couple-sessions/${id}`, undefined], [p, 'GET', 'couple-sessions', undefined], [p, 'GET', 'couple-link-policy', undefined],
      ] as const;
      for (const [actor, method, path, payload] of cases) { const reply = await request(actor, method, path, payload); expect(reply.statusCode, reply.body).toBe(500); for (const secret of [issued.invitationToken, peer.phone, 'synthetic audit failure']) expect(reply.body).not.toContain(secret); }
      expect(await db.coupleSession.count({ where: { initiatorPatientId: p.patientId } })).toBe(before);
      expect(await db.coupleParticipant.count({ where: { sessionId: id } })).toBe(1); expect((await db.coupleInvitation.findUniqueOrThrow({ where: { id: issued.invitationId } })).status).toBe('PENDING');
      expect((await db.coupleParticipant.findUniqueOrThrow({ where: { sessionId_patientId: { sessionId: withdrawalId, patientId: p.patientId } } })).revokedAt).toBeNull();
    } finally { await db.$executeRaw(Prisma.sql`DROP TRIGGER couple_test_audit_fail ON audit_events`); await db.$executeRaw(Prisma.sql`DROP FUNCTION couple_test_audit_fail()`); }
  });
  it('enforces authenticated command rate limits and revoked sessions', async () => {
    const p = await patient();
    for (let n = 0; n < 30; n++) expect((await request(p, 'POST', 'couple-invitations/preview', { invitationToken: 'invalid' })).statusCode).toBe(400);
    const limited = await request(p, 'POST', 'couple-invitations/preview', { invitationToken: 'invalid' }); expect(limited.statusCode).toBe(429); expect(limited.json().code).toBe('COUPLE_RATE_LIMITED');
    await db.session.update({ where: { id: p.sessionId }, data: { revokedAt: new Date(), revokedReason: 'LOGOUT' } }); expect((await request(p, 'GET', 'couple-sessions')).statusCode).toBe(401);
  });
  it('database preserves consent evidence and enforces two independent participant slots', async () => {
    const p = await patient(), peer = await patient(); const id = await session(p); const issued = await invite(p, id, peer); expect((await accept(peer, issued.invitationToken)).statusCode).toBe(201);
    const participant = await db.coupleParticipant.findUniqueOrThrow({ where: { sessionId_patientId: { sessionId: id, patientId: p.patientId } } });
    await expect(db.coupleParticipant.update({ where: { id: participant.id }, data: { consentContentHash: 'b'.repeat(64) } })).rejects.toThrow(/immutable/);
    await expect(db.coupleParticipant.delete({ where: { id: participant.id } })).rejects.toThrow(/retained/);
    await expect(db.coupleParticipant.create({ data: { ...participant, id: randomUUID(), slot: 'THIRD' } })).rejects.toThrow();
    await request(p, 'POST', `couple-sessions/${id}/consent-withdrawal`);
    await expect(db.coupleParticipant.update({ where: { id: participant.id }, data: { revokedAt: null } })).rejects.toThrow(/revocation is final/);
    await expect(db.coupleSession.update({ where: { id }, data: { state: 'LINKED' } })).rejects.toThrow(/immutable/);
    const audits = await db.auditEvent.findMany({ where: { subjectType: 'COUPLE_ACCOUNT_LINK', actorUserId: p.userId }, select: { metadata: true } });
    for (const record of audits) expect(record.metadata).toEqual({});
  });
  it('database rejects orphan sessions, forged independent identity and duplicate pending invitations', async () => {
    const p = await patient(), peer = await patient(); const id = await session(p); const invitation = await invite(p, id, peer); const source = await db.coupleSession.findUniqueOrThrow({ where: { id } });
    await expect(db.coupleSession.create({ data: { ...source, id: randomUUID(), idempotencyKey: randomUUID() } })).rejects.toThrow(/independent participant consents/);
    await expect(db.coupleParticipant.create({ data: { sessionId: id, clinicId, patientId: peer.patientId, slot: 'PARTNER', consentPolicyVersionId: policyId, consentContentHash: source.consentContentHash, acceptedByUserId: p.userId, acceptedSessionId: p.sessionId } })).rejects.toThrow(/Independent adult identity/);
    const original = await db.coupleInvitation.findUniqueOrThrow({ where: { id: invitation.invitationId } });
    await expect(db.coupleInvitation.create({ data: { ...original, id: randomUUID(), tokenHash: 'd'.repeat(64), idempotencyKey: randomUUID() } })).rejects.toThrow(/one_pending/);
    await expect(db.coupleInvitation.update({ where: { id: original.id }, data: { recipientPatientId: p.patientId } })).rejects.toThrow(/immutable/);
  });
  it('does not expose a registered-phone membership oracle without the recipient routing address', async () => {
    const p = await patient(), peer = await patient(); const id = await session(p);
    for (const phone of [peer.phone, '+989001111111']) {
      expect((await request(p, 'POST', `couple-sessions/${id}/invitations`, { recipientPhone: phone })).statusCode).toBe(400);
      const wrongAddress = await request(p, 'POST', `couple-sessions/${id}/invitations`, { recipientPhone: phone, recipientPatientId: randomUUID() });
      expect(wrongAddress.statusCode).toBe(422); expect(wrongAddress.json().code).toBe('COUPLE_INVITATION_UNAVAILABLE');
    }
    expect(await db.coupleInvitation.count({ where: { sessionId: id } })).toBe(0);
  });
});
