import {
  Body,
  ConflictException,
  Controller,
  Get,
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
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import type { AuthenticatedRequest } from '../../../../common/auth/access-token.guard';
import { RequirePermissions } from '../../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../../common/auth/authorization.policy';
import { ApiBrowserOrigin } from '../../../../common/auth/browser-origin.decorator';
import { BrowserOriginService } from '../../../../common/auth/browser-origin.service';
import { REFRESH_COOKIE_RESPONSE_HEADERS } from '../../../../common/auth/refresh-cookie.openapi';
import { RefreshCookieService } from '../../../../common/auth/refresh-cookie.service';
import { ApiErrorResponse } from '../../../../common/errors/api-error-response.decorator';
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

const getOrigin = (request: AuthenticatedRequest): string | undefined => {
  const origin = request.headers.origin;

  return Array.isArray(origin) ? origin[0] : origin;
};

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
  @RequirePermissions(PERMISSIONS.ACCOUNT_READ_SELF)
  @ApiOperation({
    operationId: 'accountGetCurrent',
    summary: 'Get the current account',
  })
  @ApiOkResponse({ type: CurrentAccountResponseDto })
  @ApiErrorResponse(
    HttpStatus.UNAUTHORIZED,
    'Access token or account is unavailable.',
  )
  @ApiErrorResponse(HttpStatus.FORBIDDEN, 'Required permission is missing.')
  async get(@Req() request: AuthenticatedRequest) {
    try {
      return await this.account.get(request.auth.userId);
    } catch (error) {
      this.rethrowAccountError(error);
    }
  }

  @Patch()
  @RequirePermissions(PERMISSIONS.ACCOUNT_UPDATE_SELF)
  @ApiBrowserOrigin()
  @ApiOperation({
    operationId: 'accountUpdateCurrent',
    summary: 'Change the current account phone number',
  })
  @ApiOkResponse({ type: CurrentAccountResponseDto })
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Request validation failed.')
  @ApiErrorResponse(
    HttpStatus.UNAUTHORIZED,
    'Access token, account, or current password is invalid.',
  )
  @ApiErrorResponse(
    HttpStatus.FORBIDDEN,
    'Permission or browser origin is invalid.',
  )
  @ApiErrorResponse(HttpStatus.CONFLICT, 'Phone number is already registered.')
  @ApiErrorResponse(HttpStatus.UNPROCESSABLE_ENTITY, 'Phone number is invalid.')
  async update(
    @Body() body: UpdateCurrentAccountDto,
    @Req() request: AuthenticatedRequest,
  ) {
    this.browserOrigins.assertAllowed(getOrigin(request));

    try {
      return await this.account.changePhone(
        request.auth.userId,
        body.currentPassword,
        body.phone,
        {
          requestId: request.id,
          ipAddress: request.ip,
          actorSessionId: request.auth.sessionId,
        },
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
  @RequirePermissions(PERMISSIONS.ACCOUNT_UPDATE_SELF)
  @ApiBrowserOrigin()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    operationId: 'accountChangePassword',
    summary: 'Change the current account password',
  })
  @ApiNoContentResponse({
    description: 'Password changed; all sessions revoked.',
    headers: REFRESH_COOKIE_RESPONSE_HEADERS,
  })
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Request validation failed.')
  @ApiErrorResponse(
    HttpStatus.UNAUTHORIZED,
    'Access token, account, or current password is invalid.',
  )
  @ApiErrorResponse(
    HttpStatus.FORBIDDEN,
    'Permission or browser origin is invalid.',
  )
  @ApiErrorResponse(
    HttpStatus.UNPROCESSABLE_ENTITY,
    'New password is invalid or unchanged.',
  )
  async changePassword(
    @Body() body: ChangePasswordDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<void> {
    this.browserOrigins.assertAllowed(getOrigin(request));

    try {
      await this.account.changePassword(
        request.auth.userId,
        body.currentPassword,
        body.newPassword,
        {
          requestId: request.id,
          ipAddress: request.ip,
          actorSessionId: request.auth.sessionId,
        },
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
