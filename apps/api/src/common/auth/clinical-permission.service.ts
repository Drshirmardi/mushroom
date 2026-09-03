import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma/prisma.service';
import { type RoleCode } from './authorization.policy';

export const CLINICAL_PERMISSIONS = [
  'clinical:record:view',
  'clinical:record:edit',
  'clinical:record:sign',
  'clinical:record:amend',
] as const;

export type ClinicalPermission = (typeof CLINICAL_PERMISSIONS)[number];

const databasePermission: Record<ClinicalPermission, 'CLINICAL_RECORD_VIEW' | 'CLINICAL_RECORD_EDIT' | 'CLINICAL_RECORD_SIGN' | 'CLINICAL_RECORD_AMEND'> = {
  'clinical:record:view': 'CLINICAL_RECORD_VIEW',
  'clinical:record:edit': 'CLINICAL_RECORD_EDIT',
  'clinical:record:sign': 'CLINICAL_RECORD_SIGN',
  'clinical:record:amend': 'CLINICAL_RECORD_AMEND',
};

@Injectable()
export class ClinicalPermissionService {
  constructor(private readonly prisma: PrismaService) {}

  async allows(roles: readonly RoleCode[], permissions: readonly ClinicalPermission[]) {
    if (permissions.length === 0) return true;
    const granted = await this.prisma.clinicalRolePermission.findMany({
      where: { role: { code: { in: [...roles] } }, permission: { in: permissions.map((permission) => databasePermission[permission]) } },
      select: { permission: true },
    });
    const values = new Set(granted.map((grant) => grant.permission));
    return permissions.every((permission) => values.has(databasePermission[permission]));
  }
}
