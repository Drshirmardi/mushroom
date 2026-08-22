import {
  Body,
  ConflictException,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import type { AuthenticatedRequest } from '../../../../common/auth/access-token.guard';
import { BrowserOriginService } from '../../../../common/auth/browser-origin.service';
import { RefreshCookieService } from '../../../../common/auth/refresh-cookie.service';
import {
  CurrentAccountUnavailableError,
  InvalidCurrentPasswordError,
  ManageAccountUseCase,
  PasswordUnchangedError,
} from '../../application/manage-account.use-case';
import { AccountPhoneAlreadyRegisteredError } from '../../application/ports/account.repository';
import { InvalidPhoneNumberError } from '../../domain/phone-number';
import { PasswordPolicyError } from '../../domain/password-policy';
import {
  ChangePasswordDto,
  CurrentAccountResponseDto,
  UpdateCurrentAccountDto,
} from './dto/me.dto';

const passwordErrorMessages = {
  PASSWORD_TOO_SHORT: 'Password is too short.',
  PASSWORD_TOO_LONG: 'Password is too long.',
  PASSWORD_UNSUPPORTED_CHARACTERS: 'Password contains unsupported characters.',
  PASSWORD_BLOCKED: 'Password is not allowed.',
} as const;

@ApiTags('Current Account')
@ApiBearerAuth('bearerAuth')
@Controller('me')
export class MeController {
  constructor(
    private readonly account: ManageAccountUseCase,
    private readonly refreshCookie: RefreshCookieService,
    private readonly browserOrigins: BrowserOriginService,
  ) {}

  @Get()
  @ApiOkResponse({ type: CurrentAccountResponseDto })
  @ApiUnauthorizedResponse({ description: 'Account is unavailable.' })
  async get(@Req() request: AuthenticatedRequest) {
    try {
      return await this.account.get(request.auth.userId);
    } catch (error) {
      this.rethrowAccountError(error);
    }
  }

  @Patch()
  @ApiOkResponse({ type: CurrentAccountResponseDto })
  @ApiUnauthorizedResponse({ description: 'Current password is invalid.' })
  @ApiConflictResponse({ description: 'Phone number is already registered.' })
  @ApiUnprocessableEntityResponse({ description: 'Phone number is invalid.' })
  async update(
    @Body() body: UpdateCurrentAccountDto,
    @Req() request: AuthenticatedRequest,
    @Headers('origin') origin?: string,
  ) {
    this.browserOrigins.assertAllowed(origin);

    try {
      return await this.account.changePhone(
        request.auth.userId,
        body.currentPassword,
        body.phone,
      );
    } catch (error) {
      if (error instanceof InvalidPhoneNumberError) {
        throw new UnprocessableEntityException({
          code: error.code,
          message: 'Phone number is invalid.',
          details: {},
        });
      }

      if (error instanceof AccountPhoneAlreadyRegisteredError) {
        throw new ConflictException({
          code: 'PHONE_ALREADY_REGISTERED',
          message: error.message,
          details: {},
        });
      }

      this.rethrowAccountError(error);
    }
  }

  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Password changed; all sessions revoked.' })
  @ApiUnauthorizedResponse({ description: 'Current password is invalid.' })
  @ApiUnprocessableEntityResponse({ description: 'New password is invalid.' })
  async changePassword(
    @Body() body: ChangePasswordDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Headers('origin') origin?: string,
  ): Promise<void> {
    this.browserOrigins.assertAllowed(origin);

    try {
      await this.account.changePassword(
        request.auth.userId,
        body.currentPassword,
        body.newPassword,
      );
      this.refreshCookie.clear(reply);
    } catch (error) {
      if (error instanceof PasswordPolicyError) {
        throw new UnprocessableEntityException({
          code: error.code,
          message: passwordErrorMessages[error.code],
          details: {},
        });
      }

      if (error instanceof PasswordUnchangedError) {
        throw new UnprocessableEntityException({
          code: error.code,
          message: error.message,
          details: {},
        });
      }

      this.rethrowAccountError(error);
    }
  }

  private rethrowAccountError(error: unknown): never {
    if (
      error instanceof CurrentAccountUnavailableError
      || error instanceof InvalidCurrentPasswordError
    ) {
      throw new UnauthorizedException({
        code: error.code,
        message: error.message,
        details: {},
      });
    }

    throw error;
  }
}
