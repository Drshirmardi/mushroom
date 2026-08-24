export const PATIENT_AUDIT_ACTIONS = {
  MEDICAL_INTAKE_READ: 'PATIENT_MEDICAL_INTAKE_READ',
  MEDICAL_INTAKE_UPDATED: 'PATIENT_MEDICAL_INTAKE_UPDATED',
  MEDICAL_INTAKE_COMPLETED: 'PATIENT_MEDICAL_INTAKE_COMPLETED',
  ADMIN_MEDICAL_INTAKE_READ: 'ADMIN_PATIENT_MEDICAL_INTAKE_READ',
  ADMIN_MEDICAL_INTAKE_CORRECTED: 'ADMIN_PATIENT_MEDICAL_INTAKE_CORRECTED',
  CONSENT_READ: 'PATIENT_CONSENT_READ',
  CONSENT_ACCEPTED: 'PATIENT_CONSENT_ACCEPTED',
  CONSENT_WITHDRAWN: 'PATIENT_CONSENT_WITHDRAWN',
} as const;

export type PatientAuditAction = (typeof PATIENT_AUDIT_ACTIONS)[keyof typeof PATIENT_AUDIT_ACTIONS];

export interface PatientAuditContext {
  requestId: string;
  ipAddress: string;
  actorUserId: string;
  actorSessionId?: string;
}

export interface PatientAuditEvent extends PatientAuditContext {
  action: PatientAuditAction;
  subjectType: 'PATIENT' | 'PATIENT_MEDICAL_INTAKE' | 'PATIENT_CONSENT_RECORD';
  subjectId: string;
  metadata?: {
    revisionNumber?: number;
    policyVersionId?: string;
    recordingMode?: 'PATIENT_ENTRY' | 'ADMIN_ON_BEHALF_CORRECTION';
    changedFieldNames?: string[];
  };
}

export abstract class PatientAuditPort {
  abstract record(event: PatientAuditEvent): Promise<void>;
}
