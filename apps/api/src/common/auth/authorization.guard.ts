import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { AuthenticatedRequest } from './access-token.guard';
import {
  REQUIRED_PERMISSIONS_KEY,
  REQUIRED_ROLES_KEY,
} from './authorization.decorator';
import {
  hasReleaseAdminRole,
  PERMISSIONS,
  permissionsFor,
  type Permission,
  type RoleCode,
} from './authorization.policy';
import { CLINICAL_PERMISSIONS, ClinicalPermissionService, type ClinicalPermission } from './clinical-permission.service';
import { PUBLIC_ROUTE_KEY } from './public.decorator';

const unauthorized = (): UnauthorizedException =>
  new UnauthorizedException({
    code: 'UNAUTHORIZED',
    message: 'Authentication required.',
    details: {},
  });

const forbidden = (): ForbiddenException =>
  new ForbiddenException({
    code: 'FORBIDDEN',
    message: 'Insufficient permissions.',
    details: {},
  });

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly clinicalPermissions?: ClinicalPermissionService) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      PUBLIC_ROUTE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) return true;

    const targets = [context.getHandler(), context.getClass()];
    const requiredRoles = this.reflector.getAllAndMerge<RoleCode[]>(
      REQUIRED_ROLES_KEY,
      targets,
    ) ?? [];
    const requiredPermissions = this.reflector.getAllAndMerge<Permission[]>(
      REQUIRED_PERMISSIONS_KEY,
      targets,
    ) ?? [];

    if (requiredRoles.length === 0 && requiredPermissions.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Partial<AuthenticatedRequest>>();
    const principal = request.auth;
    if (!principal) throw unauthorized();

    const hasRequiredRole = requiredRoles.length === 0
      || requiredRoles.some((role) => principal.roles.includes(role));
    const clinical = requiredPermissions.filter((permission): permission is ClinicalPermission => (CLINICAL_PERMISSIONS as readonly string[]).includes(permission));
    const grantedPermissions = permissionsFor(principal.roles);
    const hasStaticPermissions = requiredPermissions.filter((permission) => !clinical.includes(permission as ClinicalPermission)).every((permission) =>
      grantedPermissions.has(permission),
    );
    if (!hasRequiredRole || !hasStaticPermissions) throw forbidden();

    // Dashboard/admin permissions are deliberately fixed to the release ADMIN
    // role. Keeping this check alongside the decorator evaluation prevents a
    // future role-permission expansion from accidentally reopening a release
    // admin route merely by adding a static permission to another role.
    const requiresReleaseAdmin = requiredRoles.includes('ADMIN')
      || requiredPermissions.includes(PERMISSIONS.DASHBOARD_ACCESS);
    if (requiresReleaseAdmin && !hasReleaseAdminRole(principal.roles)) {
      throw forbidden();
    }

    if (clinical.length > 0) {
      return this.requireClinicalPermissions(principal.roles, clinical);
    }

    return true;
  }

  private async requireClinicalPermissions(
    roles: RoleCode[],
    permissions: ClinicalPermission[],
  ): Promise<boolean> {
    const allowed = await this.clinicalPermissions?.allows(roles, permissions) === true;
    if (!allowed) throw forbidden();

    return true;
  }
}
