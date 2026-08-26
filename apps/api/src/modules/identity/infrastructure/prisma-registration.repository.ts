import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { ClinicStatus, Prisma, RoleCode } from '../../../generated/prisma/client';
import {
  PhoneAlreadyRegisteredError,
  RegistrationConfigurationError,
  RegistrationRepository,
  type CreatePatientRegistration,
  type RegisteredUser,
} from '../application/ports/registration.repository';
import { SECURITY_AUDIT_ACTIONS } from '../application/security-audit';
import {
  AUDIT_SUBJECT_TYPES,
  recordSecurityAudit,
} from './prisma-security-audit';

@Injectable()
export class PrismaRegistrationRepository extends RegistrationRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async createPatient(
    registration: CreatePatientRegistration,
  ): Promise<RegisteredUser> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const patientRole = await transaction.role.findUnique({
          where: { code: RoleCode.PATIENT },
          select: { id: true },
        });

        if (!patientRole) {
          throw new RegistrationConfigurationError();
        }

        const activeClinic = await transaction.clinic.findFirst({
          where: { status: ClinicStatus.ACTIVE },
          select: { id: true },
        });

        if (!activeClinic) {
          throw new RegistrationConfigurationError();
        }

        const user = await transaction.user.create({
          data: {
            phone: registration.phone,
            credential: {
              create: { passwordHash: registration.passwordHash },
            },
            roles: {
              create: { roleId: patientRole.id },
            },
          },
          select: {
            id: true,
            phone: true,
            createdAt: true,
            roles: {
              select: {
                role: { select: { code: true } },
              },
            },
          },
        });

        await transaction.patientProfile.create({
          data: {
            userId: user.id,
            clinicId: activeClinic.id,
            createdAt: user.createdAt,
            updatedAt: user.createdAt,
          },
        });

        await recordSecurityAudit(transaction, {
          ...registration.audit,
          action: SECURITY_AUDIT_ACTIONS.ACCOUNT_REGISTERED,
          actorUserId: user.id,
          subjectType: AUDIT_SUBJECT_TYPES.USER,
          subjectId: user.id,
          metadata: { initialRole: RoleCode.PATIENT },
        });

        return {
          id: user.id,
          phone: user.phone,
          createdAt: user.createdAt,
          roles: user.roles.map(({ role }) => role.code),
        };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError
        && error.code === 'P2002'
      ) {
        throw new PhoneAlreadyRegisteredError();
      }

      throw error;
    }
  }
}
