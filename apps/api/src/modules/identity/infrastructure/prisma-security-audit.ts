import type { Prisma } from '../../../generated/prisma/client';
import type {
  SecurityAuditAction,
  SecurityAuditContext,
} from '../application/security-audit';

export const AUDIT_SUBJECT_TYPES = {
  USER: 'USER',
  SESSION: 'SESSION',
} as const;

type AuditSubjectType = (
  typeof AUDIT_SUBJECT_TYPES
)[keyof typeof AUDIT_SUBJECT_TYPES];

interface SecurityAuditEvent extends SecurityAuditContext {
  action: SecurityAuditAction;
  actorUserId: string;
  subjectType: AuditSubjectType;
  subjectId: string;
  metadata?: Prisma.InputJsonObject;
}

const limitRequestId = (requestId: string): string =>
  [...requestId].slice(0, 128).join('');

export const recordSecurityAudit = async (
  transaction: Prisma.TransactionClient,
  event: SecurityAuditEvent,
): Promise<void> => {
  await transaction.auditEvent.create({
    data: {
      action: event.action,
      actorUserId: event.actorUserId,
      actorSessionId: event.actorSessionId,
      subjectType: event.subjectType,
      subjectId: event.subjectId,
      requestId: limitRequestId(event.requestId),
      ipAddress: event.ipAddress,
      metadata: event.metadata ?? {},
    },
  });
};
