import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { AssessmentProtocolService } from '../protocol/assessment-protocol.service';
import type { GuidanceActorContext } from '../../content/guidance/guidance-authority.service';
import { isTieBreakStructure } from '../domain/assessment-engine-definition';
import { ownedAssessmentGrantWhere } from './assessment-access.policy';

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
    const grant = await tx.assessmentAccessGrant.findFirst({ where: { ...ownedAssessmentGrantWhere, id, patientId: patient.id, clinicId: patient.clinicId },
      include: { purchase: { include: { publication: { include: { offeringVersion: true } } } }, submission: { select: { id: true } } } });
    if (!grant) throw new NotFoundException({ code: 'ASSESSMENT_PURCHASE_NOT_FOUND', message: 'Owned assessment access was not found.', details: {} });
    const locked = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id FROM patient_consent_records WHERE id=${grant.processingConsentRecordId}::uuid AND withdrawn_at IS NULL FOR SHARE`);
    if (!locked.length) throw assessmentAccessUnavailable();
    await tx.$queryRaw(Prisma.sql`SELECT i.id FROM patient_medical_intakes i JOIN patient_medical_intake_revisions r ON r.intake_id=i.id AND r.revision_number=i.current_revision_number WHERE i.patient_id=${patient.id}::uuid FOR SHARE OF i,r`);
    const [age] = await tx.$queryRaw<{ adult: boolean }[]>(Prisma.sql`SELECT couple_patient_is_adult(${patient.id}::uuid) AS adult`); if (!age!.adult) throw assessmentAccessUnavailable();
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${'assessment-protocol:' + grant.assessmentVersionId},0))`);
    await tx.$queryRaw(Prisma.sql`SELECT id FROM assessment_versions WHERE id=${grant.assessmentVersionId}::uuid FOR SHARE`);
    if (grant.freeAdminPublicationId) {
      await tx.$queryRaw(Prisma.sql`SELECT o.id FROM assessment_admin_publications pub JOIN assessment_offering_versions o ON o.id=pub.offering_version_id WHERE pub.id=${grant.freeAdminPublicationId}::uuid FOR SHARE OF pub,o`);
      await tx.$queryRaw(Prisma.sql`SELECT p.id FROM consent_policy_versions p JOIN patient_consent_records c ON c.policy_version_id=p.id WHERE c.id=${grant.processingConsentRecordId}::uuid FOR SHARE OF p`);
      const [proof] = await tx.$queryRaw<{ allowed: boolean }[]>(Prisma.sql`SELECT assessment_free_grant_processable(${grant.id}::uuid) AS allowed`);
      if (!proof?.allowed) throw assessmentAccessUnavailable();
      return grant;
    }
    if (grant.purchase?.adminPublicationId) {
      await tx.$executeRaw(Prisma.sql`SELECT assessment_admin_purchase_lock(p) FROM assessment_purchases p WHERE p.id=${grant.purchase.id}::uuid`);
      const [proof] = await tx.$queryRaw<{ allowed: boolean }[]>(Prisma.sql`SELECT assessment_grant_processable(${grant.id}::uuid) AS allowed`);
      if (!proof?.allowed) throw assessmentAccessUnavailable();
      return grant;
    }
    const review = await this.protocols.usableApproval(tx, patient.clinicId, grant.assessmentVersionId);
    if (!review || review.id !== grant.purchase?.publication?.protocolReviewId) throw assessmentAccessUnavailable();
    await this.protocols.lockApprovalAuthority(tx, review);
    return grant;
  }
  async processingQuestionnaire(tx: Prisma.TransactionClient, versionId: string, patient: { id: string; clinicId: string }, ctx: GuidanceActorContext, allowRetired = false) {
    const source = await tx.assessmentVersion.findFirst({ where: { id: versionId, clinicId: patient.clinicId }, select: { structure: true, status: true, publishedAt: true, publishedByUserId: true } });
    if (!source || !isTieBreakStructure(source.structure)) return;
    if ((source.status !== 'PUBLISHED' && !(allowRetired && source.status === 'RETIRED')) || !source.publishedAt || !source.publishedByUserId) throw assessmentAccessUnavailable();
    await this.self(tx, patient, ctx);
  }

  async processingSubmission(tx: Prisma.TransactionClient, submission: { accessGrantId: string | null; assessmentVersionId?: string }, patient: { id: string; clinicId: string }, ctx: GuidanceActorContext) {
    if (submission.accessGrantId) { await this.processingGrant(tx, submission.accessGrantId, patient, ctx); return null; }
    if (submission.assessmentVersionId) return this.processingQuestionnaire(tx, submission.assessmentVersionId, patient, ctx, true);
    return null;
  }
}
