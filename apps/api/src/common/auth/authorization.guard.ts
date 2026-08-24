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
  permissionsFor,
  type Permission,
  type RoleCode,
} from './authorization.policy';
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
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
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
    const grantedPermissions = permissionsFor(principal.roles);
    const hasRequiredPermissions = requiredPermissions.every((permission) =>
      grantedPermissions.has(permission),
    );

    if (!hasRequiredRole || !hasRequiredPermissions) throw forbidden();

    return true;
  }
}
