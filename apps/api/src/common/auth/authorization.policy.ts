export const ROLE_CODES = [
  'PATIENT',
  'DOCTOR',
  'STAFF',
  'ADMIN',
] as const;

export type RoleCode = (typeof ROLE_CODES)[number];

export const PERMISSIONS = {
  ACCOUNT_READ_SELF: 'account:read:self',
  ACCOUNT_UPDATE_SELF: 'account:update:self',
  SESSION_READ_SELF: 'session:read:self',
  SESSION_REVOKE_SELF: 'session:revoke:self',
  DASHBOARD_ACCESS: 'dashboard:access',
  IDENTITY_USERS_MANAGE: 'identity:users:manage',
  IDENTITY_ROLES_MANAGE: 'identity:roles:manage',
  PATIENT_PROFILE_READ_SELF: 'patient:profile:read:self',
  PATIENT_PROFILE_UPDATE_SELF: 'patient:profile:update:self',
  PATIENT_INTAKE_READ_SELF: 'patient:intake:read:self',
  PATIENT_INTAKE_UPDATE_SELF: 'patient:intake:update:self',
  PATIENT_CONSENT_READ_SELF: 'patient:consent:read:self',
  PATIENT_CONSENT_MANAGE_SELF: 'patient:consent:manage:self',
  PATIENTS_READ: 'patients:read',
  PATIENTS_CREATE: 'patients:create',
  PATIENTS_UPDATE: 'patients:update',
  PATIENTS_INTAKE_UPDATE: 'patients:intake:update',
  ASSESSMENTS_MANAGE: 'assessments:manage',
  ASSESSMENTS_READ_SELF: 'assessments:read:self',
  ASSESSMENTS_WRITE_SELF: 'assessments:write:self',
  DIRECTORY_MANAGE: 'directory:manage',
  SCHEDULING_MANAGE: 'scheduling:manage',
  DIRECTORY_READ_SELF: 'directory:read:self',
  AVAILABILITY_READ_SELF: 'availability:read:self',
  APPOINTMENTS_CREATE_SELF: 'appointments:create:self',
  APPOINTMENTS_READ_SELF: 'appointments:read:self',
  APPOINTMENTS_CHANGE_SELF: 'appointments:change:self',
  APPOINTMENTS_MANAGE: 'appointments:manage',
  CLINICAL_RECORD_VIEW: 'clinical:record:view',
  CLINICAL_RECORD_EDIT: 'clinical:record:edit',
  CLINICAL_RECORD_SIGN: 'clinical:record:sign',
  CLINICAL_RECORD_AMEND: 'clinical:record:amend',
  PRESCRIPTION_ISSUE: 'prescription:issue',
  CONTENT_READ_SELF: 'content:read:self',
  CONTENT_MANAGE: 'content:manage',
  COMMERCE_MANAGE: 'commerce:manage',
  COMMERCE_READ_SELF: 'commerce:read:self',
  COMMERCE_WRITE_SELF: 'commerce:write:self',
  CHAT_CONVERSATION_READ: 'chat:conversation:read',
  CHAT_MESSAGE_SEND: 'chat:message:send',
  CHAT_REPORT_CREATE: 'chat:report:create',
  CHAT_MODERATE: 'chat:moderate',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const SELF_SERVICE_PERMISSIONS = [
  PERMISSIONS.ACCOUNT_READ_SELF,
  PERMISSIONS.ACCOUNT_UPDATE_SELF,
  PERMISSIONS.SESSION_READ_SELF,
  PERMISSIONS.SESSION_REVOKE_SELF,
] as const;

const PATIENT_ONBOARDING_PERMISSIONS = [
  PERMISSIONS.PATIENT_PROFILE_READ_SELF,
  PERMISSIONS.PATIENT_PROFILE_UPDATE_SELF,
  PERMISSIONS.PATIENT_INTAKE_READ_SELF,
  PERMISSIONS.PATIENT_INTAKE_UPDATE_SELF,
  PERMISSIONS.PATIENT_CONSENT_READ_SELF,
  PERMISSIONS.PATIENT_CONSENT_MANAGE_SELF,
] as const;

const ROLE_PERMISSIONS: Readonly<Record<RoleCode, readonly Permission[]>> = {
  PATIENT: [...SELF_SERVICE_PERMISSIONS, ...PATIENT_ONBOARDING_PERMISSIONS, PERMISSIONS.ASSESSMENTS_READ_SELF, PERMISSIONS.ASSESSMENTS_WRITE_SELF, PERMISSIONS.DIRECTORY_READ_SELF, PERMISSIONS.AVAILABILITY_READ_SELF, PERMISSIONS.APPOINTMENTS_CREATE_SELF, PERMISSIONS.APPOINTMENTS_READ_SELF, PERMISSIONS.APPOINTMENTS_CHANGE_SELF, PERMISSIONS.CONTENT_READ_SELF, PERMISSIONS.COMMERCE_READ_SELF, PERMISSIONS.COMMERCE_WRITE_SELF, PERMISSIONS.CHAT_CONVERSATION_READ, PERMISSIONS.CHAT_MESSAGE_SEND, PERMISSIONS.CHAT_REPORT_CREATE],
  DOCTOR: [...SELF_SERVICE_PERMISSIONS, PERMISSIONS.CHAT_CONVERSATION_READ, PERMISSIONS.CHAT_MESSAGE_SEND, PERMISSIONS.CHAT_REPORT_CREATE],
  STAFF: [...SELF_SERVICE_PERMISSIONS],
  ADMIN: [
    ...SELF_SERVICE_PERMISSIONS,
    PERMISSIONS.DASHBOARD_ACCESS,
    PERMISSIONS.IDENTITY_USERS_MANAGE,
    PERMISSIONS.IDENTITY_ROLES_MANAGE,
    ...PATIENT_ONBOARDING_PERMISSIONS,
    PERMISSIONS.PATIENTS_READ,
    PERMISSIONS.PATIENTS_CREATE,
    PERMISSIONS.PATIENTS_UPDATE,
    PERMISSIONS.PATIENTS_INTAKE_UPDATE,
    PERMISSIONS.ASSESSMENTS_MANAGE,
    PERMISSIONS.DIRECTORY_MANAGE,
    PERMISSIONS.SCHEDULING_MANAGE,
    PERMISSIONS.APPOINTMENTS_MANAGE,
    PERMISSIONS.CONTENT_MANAGE,
    PERMISSIONS.COMMERCE_MANAGE,
    PERMISSIONS.CHAT_CONVERSATION_READ,
    PERMISSIONS.CHAT_MESSAGE_SEND,
    PERMISSIONS.CHAT_REPORT_CREATE,
    PERMISSIONS.CHAT_MODERATE,
  ],
};

const ROLE_CODE_SET = new Set<string>(ROLE_CODES);

export const isRoleCode = (value: unknown): value is RoleCode =>
  typeof value === 'string' && ROLE_CODE_SET.has(value);

export const permissionsFor = (
  roles: readonly RoleCode[],
): ReadonlySet<Permission> => {
  const permissions = new Set<Permission>();

  for (const role of roles) {
    for (const permission of ROLE_PERMISSIONS[role] ?? []) {
      permissions.add(permission);
    }
  }

  return permissions;
};

/**
 * Phase 11 release policy: only an ADMIN identity can enter the dashboard or
 * use an administrative capability. Other retained role records keep their
 * existing non-dashboard compatibility paths, but never confer release-admin
 * access.
 */
export const hasReleaseAdminRole = (roles: readonly RoleCode[]): boolean =>
  roles.includes('ADMIN');
