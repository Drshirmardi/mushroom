import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { Prisma, RoleCode } from '../../../generated/prisma/client';
import {
  PhoneAlreadyRegisteredError,
  RegistrationConfigurationError,
  RegistrationRepository,
  type CreatePatientRegistration,
  type RegisteredUser,
} from '../application/ports/registration.repository';

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
