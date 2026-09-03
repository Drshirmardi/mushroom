import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { PatientAccessAction, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';

export type ClinicalAuditContext = {
  actorUserId: string;
  actorSessionId: string;
  requestId: string;
  correlationId?: string;
  ipAddress: string;
};

export type ClinicalAuditEvent = {
  clinicId: string;
  patientId: string;
  action: PatientAccessAction;
  resourceType: string;
  resourceId?: string;
  resourceRevisionId?: string;
  metadata?: Record<string, string | number | boolean | null | string[]>;
};

@Injectable()
export class ClinicalAccessAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(event: ClinicalAuditEvent, context: ClinicalAuditContext, tx: Prisma.TransactionClient = this.prisma) {
    try {
      await tx.patientAccessAudit.create({
        data: {
          clinicId: event.clinicId,
          patientId: event.patientId,
          actorUserId: context.actorUserId,
          actorSessionId: context.actorSessionId,
          action: event.action,
          resourceType: event.resourceType,
          resourceId: event.resourceId,
          resourceRevisionId: event.resourceRevisionId,
          requestId: context.requestId.slice(0, 128),
          correlationId: context.correlationId?.slice(0, 128),
          ipAddress: context.ipAddress,
          metadata: (event.metadata ?? {}) as Prisma.InputJsonObject,
        },
      });
    } catch {
      throw new ServiceUnavailableException({ code: 'CLINICAL_AUDIT_UNAVAILABLE', message: 'The clinical access audit is unavailable.', details: {} });
    }
  }
}
