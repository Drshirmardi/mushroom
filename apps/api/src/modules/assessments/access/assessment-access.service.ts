import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { AssessmentProtocolService } from '../protocol/assessment-protocol.service';
import type { GuidanceActorContext } from '../../content/guidance/guidance-authority.service';

export const assessmentAccessUnavailable = () => new ConflictException({ code: 'ASSESSMENT_ACCESS_UNAVAILABLE', message: 'The exact paid assessment access or processing approval is unavailable.', details: {} });
@Injectable()
export class AssessmentAccessService {
  constructor(private readonly protocols: AssessmentProtocolService) {}

  async self(tx: Prisma.TransactionClient, patient: { id: string; clinicId: string }, ctx: GuidanceActorContext) {
    const actors = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT p.id FROM patient_profiles p JOIN users u ON u.id=p.user_id JOIN clinics c ON c.id=p.clinic_id JOIN sessions s ON s.user_id=u.id JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE p.id=${patient.id}::uuid AND p.clinic_id=${patient.clinicId}::uuid AND u.id=${ctx.actorUserId}::uuid AND s.id=${ctx.actorSessionId}::uuid AND s.revoked_at IS NULL AND s.expires_at>CURRENT_TIMESTAMP AND u.status='ACTIVE' AND c.status='ACTIVE' AND r.code='PATIENT' FOR SHARE OF p,u,c,s,ur,r`);
    if (!actors.length) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Active patient self access required.', details: {} });
  }
  async processingGrant(tx: Prisma.TransactionClient, id: string, patient: { id: string; clinicId: string }, ctx: GuidanceActorContext) {
    await this.self(tx, patient, ctx);
    const grant = await tx.assessmentAccessGrant.findFirst({ where: { id, patientId: patient.id, clinicId: patient.clinicId, processingConsent: { withdrawnAt: null }, purchase: { intent: { purpose: 'ASSESSMENT', status: 'PAID' } } },
      include: { purchase: { include: { publication: { include: { offeringVersion: true } } } }, submission: { select: { id: true } } } });
    if (!grant) throw new NotFoundException({ code: 'ASSESSMENT_PURCHASE_NOT_FOUND', message: 'Owned assessment access was not found.', details: {} });
    const locked = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id FROM patient_consent_records WHERE id=${grant.processingConsentRecordId}::uuid AND withdrawn_at IS NULL FOR SHARE`);
    if (!locked.length) throw assessmentAccessUnavailable();
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${'assessment-protocol:' + grant.assessmentVersionId},0))`);
    await tx.$queryRaw(Prisma.sql`SELECT id FROM assessment_versions WHERE id=${grant.assessmentVersionId}::uuid FOR SHARE`);
    const review = await this.protocols.usableApproval(tx, patient.clinicId, grant.assessmentVersionId);
    if (!review || review.id !== grant.purchase.publication.protocolReviewId) throw assessmentAccessUnavailable();
    await this.protocols.lockApprovalAuthority(tx, review);
    return grant;
  }
  async processingSubmission(tx: Prisma.TransactionClient, submission: { accessGrantId: string | null }, patient: { id: string; clinicId: string }, ctx: GuidanceActorContext) {
    if (submission.accessGrantId) await this.processingGrant(tx, submission.accessGrantId, patient, ctx);
  }
}
