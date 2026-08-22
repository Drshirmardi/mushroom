import { SetMetadata } from '@nestjs/common';

import type { Permission, RoleCode } from './authorization.policy';

export const REQUIRED_ROLES_KEY = 'authorization:required-roles';
export const REQUIRED_PERMISSIONS_KEY = 'authorization:required-permissions';

/** Any listed role is sufficient. Prefer permissions for capability checks. */
export const RequireRoles = (
  ...roles: RoleCode[]
): MethodDecorator & ClassDecorator =>
  SetMetadata(REQUIRED_ROLES_KEY, roles);

/** Every listed permission is required. Resource ownership remains a use-case concern. */
export const RequirePermissions = (
  ...permissions: Permission[]
): MethodDecorator & ClassDecorator =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);
