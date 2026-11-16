import { BadRequestException, ConflictException, ForbiddenException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { createHash } from 'node:crypto';

import { ClinicalPermissionService, type ClinicalPermission } from '../../common/auth/clinical-permission.service';
import type { RoleCode } from '../../common/auth/authorization.policy';
import { PrismaService } from '../../database/prisma/prisma.service';
import { PatientAccessAction, PrescriptionRevisionState, Prisma } from '../../generated/prisma/client';
import type { CreatePrescriptionDto, IssuePrescriptionDto, SavePrescriptionDraftDto } from './prescription.dto';
import { ClinicalResourceAccessService } from './clinical-resource-access.service';
import { VisitCareService } from './visit-care.service';
import { ClinicalAccessAuditService } from './clinical-access-audit.service';

type PrescriptionActor = { actorUserId: string; actorSessionId?: string; requestId?: string; ipAddress?: string; roles: RoleCode[] };
type PrescriptionItemInput = CreatePrescriptionDto['items'][number];

const forbidden = () => new ForbiddenException({ code: 'PRESCRIPTION_RESOURCE_FORBIDDEN', message: 'The prescription is not available to this actor.', details: {} });
const revisionConflict = (currentRevision: number) => new ConflictException({ code: 'PRESCRIPTION_REVISION_CONFLICT', message: 'The prescription revision is no longer current.', details: { currentRevision } });
const issueNotAllowed = () => new ConflictException({ code: 'PRESCRIPTION_ISSUE_NOT_ALLOWED', message: 'Only the current draft prescription revision with at least one item may be issued.', details: {} });
const amendmentReasonRequired = () => new UnprocessableEntityException({ code: 'PRESCRIPTION_AMENDMENT_REASON_REQUIRED', message: 'An amendment reason category is required when revising issued content.', details: {} });

@Injectable()
export class PrescriptionService {
  constructor(private readonly prisma: PrismaService, private readonly access: ClinicalResourceAccessService, private readonly permissions: ClinicalPermissionService, private readonly audit: ClinicalAccessAuditService, private readonly visits: VisitCareService) {}

  async list(patientId: string, actor: PrescriptionActor, cursor?: string, limit = 50) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new BadRequestException({ code: 'BAD_REQUEST', message: 'Limit must be between 1 and 100.', details: {} });
    const patient = await this.access.patient(actor.actorUserId, patientId);
    await this.require(actor, 'clinical:record:view');
    const records = await this.prisma.prescription.findMany({
      where: { patientId: patient.id, clinicId: patient.clinicId },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { revisions: { orderBy: { revisionNumber: 'desc' }, take: 1, include: { items: { orderBy: { position: 'asc' } } } } },
    });
    const hasNext = records.length > limit;
    const items = hasNext ? records.slice(0, limit) : records;
    const identity = await this.prisma.patientProfile.findUnique({ where: { id: patient.id }, select: { user: { select: { userProfile: { select: { firstName: true, lastName: true } } } } } });
    return { patientDisplayName: [identity?.user.userProfile?.firstName, identity?.user.userProfile?.lastName].filter(Boolean).join(' ').trim() || null, items: items.map((record) => this.response(record, record.revisions[0] ?? null)), nextCursor: hasNext ? items.at(-1)?.id ?? null : null };
  }

  async get(patientId: string, prescriptionId: string, actor: PrescriptionActor) {
    const patient = await this.access.patient(actor.actorUserId, patientId);
    await this.require(actor, 'clinical:record:view');
    const prescription = await this.prescription(prescriptionId, patient.id, patient.clinicId);
    return this.response(prescription, prescription.revisions[0] ?? null);
  }

  async create(patientId: string, input: CreatePrescriptionDto, actor: PrescriptionActor) {
    const patient = await this.access.patient(actor.actorUserId, patientId);
    await this.require(actor, 'clinical:record:edit');
    if (input.expectedRevision !== 0) throw revisionConflict(0);
    const context = this.context(actor);
    if (input.appointmentId) {
      const visit = await this.visits.authorize(input.appointmentId, { ...context, roles: actor.roles });
      if (visit.patientId !== patient.id) throw forbidden();
    }
    const requestHash = createHash('sha256').update(JSON.stringify({ items: input.items, appointmentId: input.appointmentId ?? null })).digest('hex');
    return this.prisma.$transaction(async (tx) => {
      if (input.commandId) {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`prescription-create:${input.commandId}`}, 0))::text`;
        const existing = await tx.prescription.findUnique({ where: { id: input.commandId }, include: { revisions: { orderBy: { revisionNumber: 'desc' }, take: 1, include: { items: { orderBy: { position: 'asc' } } } } } });
        if (existing) {
          const event = await tx.patientAccessAudit.findFirst({ where: { resourceType: 'PRESCRIPTION', resourceId: existing.id, action: PatientAccessAction.CREATE }, orderBy: { createdAt: 'asc' } });
          if (existing.patientId !== patient.id || existing.clinicId !== patient.clinicId || event?.actorUserId !== actor.actorUserId) throw forbidden();
          if ((event.metadata as Record<string, unknown>)?.requestHash !== requestHash) throw revisionConflict(existing.currentRevisionNumber);
          return this.response(existing, existing.revisions[0] ?? null);
        }
      }
      const prescription = await tx.prescription.create({
        data: { ...(input.commandId ? { id: input.commandId } : {}), clinicId: patient.clinicId, patientId: patient.id, currentRevisionNumber: 1, revisions: { create: this.draft(1, input.items, actor.actorUserId) } },
        include: { revisions: { include: { items: { orderBy: { position: 'asc' } } } } },
      });
      await this.audit.record({ clinicId: patient.clinicId, patientId: patient.id, action: PatientAccessAction.CREATE, resourceType: 'PRESCRIPTION', resourceId: prescription.id, metadata: { appointmentId: input.appointmentId ?? null, requestHash } }, context, tx);
      return this.response(prescription, prescription.revisions[0]);
    });
  }

  async history(patientId: string, id: string, actor: PrescriptionActor, before?: number) {
    if (before !== undefined && (!Number.isInteger(before) || before < 1)) throw new BadRequestException({ code: 'BAD_REQUEST', message: 'Revision cursor is invalid.', details: {} });
    const patient = await this.access.patient(actor.actorUserId, patientId);
    await this.require(actor, 'clinical:record:view');
    const prescription = await this.prescription(id, patient.id, patient.clinicId);
    const rows = await this.prisma.prescriptionRevision.findMany({ where: { prescriptionId: id, ...(before ? { revisionNumber: { lt: before } } : {}) }, orderBy: { revisionNumber: 'desc' }, take: 21, include: { items: { orderBy: { position: 'asc' } } } });
    return { items: rows.slice(0, 20).map(revision => this.response(prescription, revision)), nextBefore: rows.length > 20 ? rows[19]!.revisionNumber : null };
  }

  async patientList(userId: string, actor: PrescriptionActor, cursor?: string) {
    const patient = await this.prisma.patientProfile.findUnique({ where: { userId }, select: { id: true, clinicId: true } });
    if (!patient) throw forbidden();
    const rows = await this.prisma.prescription.findMany({ where: { patientId: patient.id, clinicId: patient.clinicId, currentIssuedRevisionNumber: { not: null } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 21, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), include: { revisions: { where: { state: PrescriptionRevisionState.ISSUED }, orderBy: { revisionNumber: 'desc' }, take: 1, include: { items: { orderBy: { position: 'asc' } } } } } });
    await this.audit.record({ clinicId: patient.clinicId, patientId: patient.id, action: PatientAccessAction.READ, resourceType: 'PATIENT_PRESCRIPTIONS' }, this.context(actor));
    return { items: rows.slice(0, 20).filter(row => row.revisions[0]?.revisionNumber === row.currentIssuedRevisionNumber).map(row => this.response({ ...row, currentRevisionNumber: row.currentIssuedRevisionNumber! }, row.revisions[0]!)), nextCursor: rows.length > 20 ? rows[19]!.id : null };
  }

  async save(patientId: string, prescriptionId: string, input: SavePrescriptionDraftDto, actor: PrescriptionActor) {
    const patient = await this.access.patient(actor.actorUserId, patientId);
    await this.require(actor, 'clinical:record:edit');
    return this.prisma.$transaction(async (tx) => {
      await this.lock(tx, prescriptionId);
      const prescription = await this.prescription(prescriptionId, patient.id, patient.clinicId, tx);
      if (prescription.currentRevisionNumber !== input.expectedRevision) throw revisionConflict(prescription.currentRevisionNumber);
      const previous = prescription.revisions[0];
      if (!previous) throw revisionConflict(0);
      const reason = this.reason(input.amendmentReasonCategory);
      if (previous.state === PrescriptionRevisionState.ISSUED && !reason) throw amendmentReasonRequired();
      if (previous.state !== PrescriptionRevisionState.DRAFT && previous.state !== PrescriptionRevisionState.ISSUED) throw issueNotAllowed();
      const revisionNumber = prescription.currentRevisionNumber + 1;
      const revision = await tx.prescriptionRevision.create({ data: { prescriptionId, ...this.draft(revisionNumber, input.items, actor.actorUserId, previous.id, reason) }, include: { items: { orderBy: { position: 'asc' } } } });
      const updated = await tx.prescription.update({ where: { id: prescription.id }, data: { currentRevisionNumber: revisionNumber } });
      return this.response(updated, revision);
    });
  }

  async issue(patientId: string, prescriptionId: string, input: IssuePrescriptionDto, actor: PrescriptionActor) {
    const patient = await this.access.patient(actor.actorUserId, patientId);
    await this.require(actor, 'prescription:issue');
    return this.prisma.$transaction(async (tx) => {
      await this.lock(tx, prescriptionId);
      const prescription = await this.prescription(prescriptionId, patient.id, patient.clinicId, tx);
      if (prescription.currentRevisionNumber !== input.expectedRevision) throw revisionConflict(prescription.currentRevisionNumber);
      if (input.revisionNumber !== prescription.currentRevisionNumber) throw issueNotAllowed();
      const revision = prescription.revisions[0];
      if (!revision || revision.revisionNumber !== input.revisionNumber) throw issueNotAllowed();
      if (revision.state === PrescriptionRevisionState.ISSUED) return this.response(prescription, revision);
      if (revision.state !== PrescriptionRevisionState.DRAFT || revision.items.length === 0) throw issueNotAllowed();
      const integrityHash = this.integrityHash(prescription.id, revision);
      const issued = await tx.prescriptionRevision.update({ where: { id: revision.id }, data: { state: PrescriptionRevisionState.ISSUED, issuedAt: new Date(), issuedByUserId: actor.actorUserId, integrityHash }, include: { items: { orderBy: { position: 'asc' } } } });
      const updated = await tx.prescription.update({ where: { id: prescription.id }, data: { currentIssuedRevisionNumber: issued.revisionNumber, latestIssuedRevisionNumber: issued.revisionNumber } });
      if (!actor.actorSessionId || !actor.requestId || !actor.ipAddress) throw new UnprocessableEntityException({ code: 'PRESCRIPTION_AUDIT_CONTEXT_REQUIRED', message: 'Prescription issuance requires audit context.', details: {} });
      await this.audit.record({ clinicId: patient.clinicId, patientId: patient.id, action: PatientAccessAction.SIGN, resourceType: 'PRESCRIPTION', resourceId: prescription.id, resourceRevisionId: issued.id, metadata: { revisionNumber: issued.revisionNumber } }, { actorUserId: actor.actorUserId, actorSessionId: actor.actorSessionId, requestId: actor.requestId, ipAddress: actor.ipAddress }, tx);
      return this.response(updated, issued);
    });
  }

  private context(actor: PrescriptionActor) {
    if (!actor.actorSessionId || !actor.requestId || !actor.ipAddress) throw new UnprocessableEntityException({ code: 'PRESCRIPTION_AUDIT_CONTEXT_REQUIRED', message: 'Audit context is required.', details: {} });
    return { actorUserId: actor.actorUserId, actorSessionId: actor.actorSessionId, requestId: actor.requestId, ipAddress: actor.ipAddress };
  }
  private async require(actor: PrescriptionActor, permission: ClinicalPermission) { if (!await this.permissions.allows(actor.roles, [permission])) throw forbidden(); }
  private async lock(tx: Prisma.TransactionClient, prescriptionId: string) { await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`prescription:${prescriptionId}`}, 0))::text AS locked`; }
  private async prescription(id: string, patientId: string, clinicId: string, tx: Prisma.TransactionClient = this.prisma) {
    const prescription = await tx.prescription.findFirst({ where: { id, patientId, clinicId }, include: { revisions: { orderBy: { revisionNumber: 'desc' }, take: 1, include: { items: { orderBy: { position: 'asc' } } } } } });
    if (!prescription) throw forbidden();
    return prescription;
  }
  private draft(revisionNumber: number, items: PrescriptionItemInput[], actorUserId: string, previousRevisionId?: string, amendmentReasonCategory?: string | null) {
    return { revisionNumber, previousRevisionId, state: PrescriptionRevisionState.DRAFT, amendmentReasonCategory, authoredByUserId: actorUserId, items: { create: items.map((item, index) => ({ position: index + 1, medicationName: this.text(item.medicationName), doseText: this.optional(item.doseText), frequencyText: this.optional(item.frequencyText), durationText: this.optional(item.durationText), instructions: this.optional(item.instructions) })) } };
  }
  private text(value: string) { const text = value.trim(); if (!text) throw new UnprocessableEntityException({ code: 'PRESCRIPTION_MEDICATION_REQUIRED', message: 'A prescription item medication name must not be blank.', details: {} }); return text; }
  private optional(value: string | undefined) { const text = value?.trim() ?? null; return text || null; }
  private reason(value: string | undefined) { return this.optional(value); }
  private integrityHash(prescriptionId: string, revision: { revisionNumber: number; previousRevisionId: string | null; amendmentReasonCategory: string | null; authoredAt: Date; authoredByUserId: string | null; items: Array<{ position: number; medicationName: string; doseText: string | null; frequencyText: string | null; durationText: string | null; instructions: string | null }> }) {
    const canonical = JSON.stringify({ prescriptionId, revisionNumber: revision.revisionNumber, previousRevisionId: revision.previousRevisionId, amendmentReasonCategory: revision.amendmentReasonCategory, authoredAt: revision.authoredAt.toISOString(), authoredByUserId: revision.authoredByUserId, items: revision.items.map((item) => ({ position: item.position, medicationName: item.medicationName, doseText: item.doseText, frequencyText: item.frequencyText, durationText: item.durationText, instructions: item.instructions })) });
    return createHash('sha256').update(canonical).digest('hex');
  }
  private response(prescription: { id: string; patientId: string; currentRevisionNumber: number; currentIssuedRevisionNumber: number | null; latestIssuedRevisionNumber: number | null }, revision: { id: string; revisionNumber: number; previousRevisionId: string | null; state: PrescriptionRevisionState; amendmentReasonCategory: string | null; integrityHash: string | null; authoredAt: Date; authoredByUserId: string | null; issuedAt: Date | null; issuedByUserId: string | null; items: Array<{ id: string; position: number; medicationName: string; doseText: string | null; frequencyText: string | null; durationText: string | null; instructions: string | null }> } | null) {
    return { id: prescription.id, patientId: prescription.patientId, currentRevision: prescription.currentRevisionNumber, currentIssuedRevision: prescription.currentIssuedRevisionNumber, latestIssuedRevision: prescription.latestIssuedRevisionNumber, revision: revision ? { id: revision.id, revisionNumber: revision.revisionNumber, previousRevisionId: revision.previousRevisionId, state: revision.state, amendmentReasonCategory: revision.amendmentReasonCategory, integrityHash: revision.integrityHash, authoredAt: revision.authoredAt, authoredByUserId: revision.authoredByUserId, issuedAt: revision.issuedAt, issuedByUserId: revision.issuedByUserId, items: revision.items.map((item) => ({ id: item.id, position: item.position, medicationName: item.medicationName, doseText: item.doseText, frequencyText: item.frequencyText, durationText: item.durationText, instructions: item.instructions })) } : null };
  }
}
