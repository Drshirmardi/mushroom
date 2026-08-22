import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { LoginAttemptOutcome } from '../../../generated/prisma/client';
import {
  LoginRepository,
  type LoginAttemptFinalOutcome,
  type LoginAttemptReservation,
  type LoginSubject,
  type ReserveLoginAttempt,
} from '../application/ports/login.repository';

const COUNTED_OUTCOMES = [
  LoginAttemptOutcome.PENDING,
  LoginAttemptOutcome.INVALID_CREDENTIALS,
  LoginAttemptOutcome.ACCOUNT_DISABLED,
];

@Injectable()
export class PrismaLoginRepository extends LoginRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async reserveAttempt(
    request: ReserveLoginAttempt,
  ): Promise<LoginAttemptReservation> {
    return this.prisma.$transaction(async (transaction) => {
      const lockKeys = [
        `login:ip:${request.ipAddress}`,
        ...(request.phone ? [`login:phone:${request.phone}`] : []),
      ].sort();

      for (const lockKey of lockKeys) {
        await transaction.$queryRaw`
          SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))::text
            AS locked
        `;
      }

      const [phoneAttempts, ipAttempts] = await Promise.all([
        request.phone
          ? transaction.loginAttempt.count({
              where: {
                phone: request.phone,
                createdAt: { gte: request.windowStartedAt },
                outcome: { in: COUNTED_OUTCOMES },
              },
            })
          : Promise.resolve(0),
        transaction.loginAttempt.count({
          where: {
            ipAddress: request.ipAddress,
            createdAt: { gte: request.windowStartedAt },
            outcome: { in: COUNTED_OUTCOMES },
          },
        }),
      ]);

      const rateLimited = phoneAttempts >= request.phoneLimit
        || ipAttempts >= request.ipLimit;
      const attempt = await transaction.loginAttempt.create({
        data: {
          phone: request.recordedPhone,
          ipAddress: request.ipAddress,
          userAgent: request.userAgent
            ? [...request.userAgent].slice(0, 512).join('')
            : undefined,
          outcome: rateLimited
            ? LoginAttemptOutcome.RATE_LIMITED
            : LoginAttemptOutcome.PENDING,
        },
        select: { id: true },
      });

      return rateLimited
        ? { allowed: false as const }
        : { allowed: true as const, attemptId: attempt.id };
    });
  }

  async findSubjectByPhone(phone: string): Promise<LoginSubject | null> {
    const user = await this.prisma.user.findUnique({
      where: { phone },
      select: {
        id: true,
        phone: true,
        status: true,
        credential: { select: { passwordHash: true } },
        roles: { select: { role: { select: { code: true } } } },
      },
    });

    if (!user?.credential) return null;

    return {
      id: user.id,
      phone: user.phone,
      status: user.status,
      passwordHash: user.credential.passwordHash,
      roles: user.roles.map(({ role }) => role.code),
    };
  }

  async completeAttempt(
    attemptId: string,
    outcome: LoginAttemptFinalOutcome,
    userId?: string,
  ): Promise<void> {
    await this.prisma.loginAttempt.update({
      where: { id: attemptId },
      data: {
        outcome: LoginAttemptOutcome[outcome],
        userId,
      },
    });
  }
}
