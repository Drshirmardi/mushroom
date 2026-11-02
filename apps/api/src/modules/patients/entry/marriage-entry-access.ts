import { Injectable } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { SmsCredentialCryptoService } from '../../communications/sms/sms-credential-crypto.service';

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
@Injectable()
export class MarriageEntryAccess {
  constructor(private readonly prisma: PrismaService, private readonly crypto: SmsCredentialCryptoService) {}
  async allows(request: Partial<AuthenticatedRequest>, path: string, method: string) {
    const id = request.headers?.['x-marriage-request-id'];
    const auth = request.auth;
    if (!auth || typeof id !== 'string' || !uuid.test(id)) return false;
    const patient = await this.prisma.patientProfile.findUnique({ where: { userId: auth.userId }, include: { user: { include: { userProfile: true } }, entry: true } });
    if (!patient || patient.user.status !== 'ACTIVE') return false;
    const verified = await this.prisma.session.count({ where: { id: auth.sessionId, userId: auth.userId, verifiedPhone: patient.user.phone, revokedAt: null, expiresAt: { gt: new Date() } } });
    if (!verified) return false;
    const row = await this.prisma.marriageServiceRequest.findFirst({ where: { id, clinicId: patient.clinicId } });
    if (!row || row.initiatorPatientId === patient.id || (row.recipientPatientId !== null ? row.recipientPatientId !== patient.id : !this.crypto.phoneFingerprints(patient.user.phone).includes(row.recipientHash))) return false;
    const root = `/v1/patients/me/marriage-requests/${id}`;
    if (method === 'GET' && path === root) return true;
    const profile = patient.user.userProfile;
    const profileComplete = !!profile?.firstName?.trim() && !!profile.lastName?.trim() && ['MALE','FEMALE'].includes(profile.gender ?? '') && !!patient.entry?.birthDate;
    if (!profileComplete) return method === 'POST' && row.status === 'PENDING' && path === root+'/review';
    if (row.status === 'PENDING') return method === 'POST' && [root+'/review',root+'/accept'].includes(path);
    if (row.status !== 'ACCEPTED' || row.recipientPatientId !== patient.id || !row.educationalId) return false;
    const source = await this.prisma.assessmentAdminPublication.findUnique({ where: { id: row.publicationId }, include: { offeringVersion: { include: { consentPolicies: true } } } });
    if (!source) return false;
    const own = await this.prisma.educationalCoupleParticipant.findUnique({ where: { sessionId_patientId: { sessionId: row.educationalId, patientId: patient.id } }, include: { accessGrant: { include: { submission: true } } } });
    if (!own) return false;
    const educational = `/v1/patients/me/educational-couple-assessments/${row.educationalId}`;
    if (method === 'GET' && [educational,educational+'/result'].includes(path)) return true;
    if (method === 'POST' && ['consent','sharing-withdrawal','free-access','billing-intents'].some(action => path === educational+'/'+action)) return true;
    const body = request.body as { policyVersionId?: unknown } | undefined;
    if (method === 'POST' && path === '/v1/patients/me/assessment-consents') return source.offeringVersion.consentPolicies.some(policy => policy.id === body?.policyVersionId && ['ASSESSMENT_PROCESSING','ASSESSMENT_PURCHASE_TERMS'].includes(policy.policyKey));
    const withdrawal = /^\/v1\/patients\/me\/assessment-consents\/([^/]+)\/withdrawal$/.exec(path);
    if (method === 'POST' && withdrawal && uuid.test(withdrawal[1])) return !!await this.prisma.patientConsentRecord.count({ where: { id: withdrawal[1], patientId: patient.id, policyVersionId: { in: source.offeringVersion.consentPolicies.map(policy => policy.id) } } });
    const grant = own.accessGrant;
    if (grant && method === 'POST' && path === `/v1/patients/me/assessment-access-grants/${grant.id}/submission`) return true;
    if (grant?.submission) {
      const submission = `/v1/assessment-submissions/${grant.submission.id}`;
      if (method === 'GET' && [submission,submission+'/questionnaire',submission+'/result',submission+'/provenance',submission+'/guidance'].includes(path) || method === 'PUT' && path === submission || method === 'POST' && path === submission+'/submit') return true;
    }
    const receipt = /^\/v1\/patients\/me\/assessment-purchases\/([^/]+)$/.exec(path);
    if (method === 'GET' && receipt && uuid.test(receipt[1])) return !!await this.prisma.assessmentPurchase.count({ where: { id: receipt[1], patientId: patient.id, clinicId:patient.clinicId, educationalCoupleSessionId:row.educationalId } });
    const billing = /^\/v1\/patients\/me\/billing\/intents\/([^/]+)(?:\/(wallet-payment|gateway-attempts|cancel))?$/.exec(path);
    if (billing && uuid.test(billing[1]) && (method === 'GET' && !billing[2] || method === 'POST' && !!billing[2])) return !!await this.prisma.billingIntent.count({ where: { id: billing[1], patientId: patient.id, clinicId: patient.clinicId, purpose: 'ASSESSMENT', assessmentPurchase: { educationalCoupleSessionId: row.educationalId } } });
    return false;
  }
}
