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
  PATIENT: [...SELF_SERVICE_PERMISSIONS, ...PATIENT_ONBOARDING_PERMISSIONS],
  DOCTOR: [...SELF_SERVICE_PERMISSIONS, PERMISSIONS.DASHBOARD_ACCESS],
  STAFF: [...SELF_SERVICE_PERMISSIONS, PERMISSIONS.DASHBOARD_ACCESS],
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
