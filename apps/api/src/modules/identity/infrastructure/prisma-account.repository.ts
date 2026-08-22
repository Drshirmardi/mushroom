import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { Prisma, SessionRevocationReason } from '../../../generated/prisma/client';
import {
  AccountPhoneAlreadyRegisteredError,
  AccountRepository,
  type AccountCredential,
  type AccountMutationResult,
  type ChangeAccountPassword,
  type ChangeAccountPhone,
  type CurrentAccount,
} from '../application/ports/account.repository';

const accountSelect = {
  id: true,
  phone: true,
  status: true,
  createdAt: true,
  credential: {
    select: {
      passwordHash: true,
      passwordChangedAt: true,
    },
  },
  roles: { select: { role: { select: { code: true } } } },
} as const;

type SelectedAccount = Prisma.UserGetPayload<{ select: typeof accountSelect }>;

const toCurrentAccount = (user: SelectedAccount): CurrentAccount | null =>
  user.credential
    ? {
        id: user.id,
        phone: user.phone,
        status: user.status,
        roles: user.roles.map(({ role }) => role.code),
        createdAt: user.createdAt,
        passwordChangedAt: user.credential.passwordChangedAt,
      }
    : null;

@Injectable()
export class PrismaAccountRepository extends AccountRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(userId: string): Promise<CurrentAccount | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: accountSelect,
    });

    return user ? toCurrentAccount(user) : null;
  }

  async findCredential(userId: string): Promise<AccountCredential | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: accountSelect,
    });
    const account = user ? toCurrentAccount(user) : null;

    return account && user?.credential
      ? { ...account, passwordHash: user.credential.passwordHash }
      : null;
  }

  async changePhone(
    input: ChangeAccountPhone,
  ): Promise<AccountMutationResult> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const credentials = await transaction.$queryRaw<Array<{ userId: string }>>`
          SELECT "user_id" AS "userId"
          FROM "credentials"
          WHERE "user_id" = ${input.userId}::uuid
            AND "password_hash" = ${input.expectedPasswordHash}
          FOR UPDATE
        `;
        if (!credentials[0]) return { kind: 'STALE' } as const;

        const user = await transaction.user.update({
          where: { id: input.userId },
          data: { phone: input.phone },
          select: accountSelect,
        });
        const account = toCurrentAccount(user);
        if (!account) return { kind: 'STALE' } as const;

        return { kind: 'CHANGED', account } as const;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError
        && error.code === 'P2002'
      ) {
        throw new AccountPhoneAlreadyRegisteredError();
      }

      throw error;
    }
  }

  async changePassword(
    input: ChangeAccountPassword,
  ): Promise<AccountMutationResult> {
    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.credential.updateMany({
        where: {
          userId: input.userId,
          passwordHash: input.expectedPasswordHash,
        },
        data: {
          passwordHash: input.passwordHash,
          passwordChangedAt: input.changedAt,
        },
      });
      if (updated.count !== 1) return { kind: 'STALE' };

      await transaction.session.updateMany({
        where: { userId: input.userId, revokedAt: null },
        data: {
          revokedAt: input.changedAt,
          revokedReason: SessionRevocationReason.PASSWORD_CHANGED,
        },
      });
      const user = await transaction.user.findUniqueOrThrow({
        where: { id: input.userId },
        select: accountSelect,
      });
      const account = toCurrentAccount(user);

      return account
        ? { kind: 'CHANGED', account }
        : { kind: 'STALE' };
    });
  }
}
