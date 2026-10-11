import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import type { AuthenticatedRequest } from '../../../../common/auth/access-token.guard';
import { SkipActiveSessionCheck } from '../../../../common/auth/active-session.decorator';
import { ACCESS_TOKEN_TTL_SECONDS } from '../../../../common/auth/access-token.service';
import { RequirePermissions } from '../../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../../common/auth/authorization.policy';
import { ApiBrowserOrigin } from '../../../../common/auth/browser-origin.decorator';
import { BrowserOriginService } from '../../../../common/auth/browser-origin.service';
import { Public } from '../../../../common/auth/public.decorator';
import { REFRESH_COOKIE_RESPONSE_HEADERS } from '../../../../common/auth/refresh-cookie.openapi';
import { RefreshCookieService } from '../../../../common/auth/refresh-cookie.service';
import { ApiErrorResponse } from '../../../../common/errors/api-error-response.decorator';
import {
  LoginSessionUseCase,
  type SessionAuthenticationResult,
} from '../../application/login-session.use-case';
import {
  InvalidCredentialsError,
  LoginRateLimitedError,
} from '../../application/login-user.use-case';
import {
  ManageSessionsUseCase,
  type SessionListResult,
} from '../../application/manage-sessions.use-case';
import {
  InvalidRefreshTokenError,
  ConcurrentRefreshError,
  RefreshRateLimitedError,
  RefreshSessionUseCase,
} from '../../application/refresh-session.use-case';
import {
  RegistrationRateLimitedError,
  RegisterUserUseCase,
  type RegisteredUser,
} from '../../application/register-user.use-case';
import { PhoneAlreadyRegisteredError } from '../../application/ports/registration.repository';
import type { SecurityAuditContext } from '../../application/security-audit';
import { OtpAuthenticationUseCase } from '../../application/otp-authentication.use-case';
import { InvalidPhoneNumberError } from '../../domain/phone-number';
import { PasswordPolicyError } from '../../domain/password-policy';
import {
  AuthenticationResponseDto,
  LoginRequestDto,
} from './dto/login.dto';
import {
  RegisterRequestDto,
  RegisterResponseDto,
} from './dto/register.dto';
import {
  SessionListQueryDto,
  SessionListResponseDto,
} from './dto/session.dto';
import { CreateOtpChallengeDto, OtpChallengeResponseDto, VerifyOtpChallengeDto } from './dto/otp.dto';

const passwordErrorMessages = {
  PASSWORD_TOO_SHORT: 'Password is too short.',
  PASSWORD_TOO_LONG: 'Password is too long.',
  PASSWORD_UNSUPPORTED_CHARACTERS: 'Password contains unsupported characters.',
  PASSWORD_BLOCKED: 'Password is not allowed.',
} as const;

const toResponse = (
  result: SessionAuthenticationResult,
): AuthenticationResponseDto => ({
  accessToken: result.accessToken,
  tokenType: 'Bearer',
  expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  user: result.user,
});

const getUserAgent = (request: FastifyRequest): string | undefined => {
  const userAgent = request.headers['user-agent'];

  return Array.isArray(userAgent) ? userAgent[0] : userAgent;
};

const getOrigin = (request: FastifyRequest): string | undefined => {
  const origin = request.headers.origin;

  return Array.isArray(origin) ? origin[0] : origin;
};

const getAuditContext = (
  request: FastifyRequest,
  actorSessionId?: string,
): SecurityAuditContext => ({
  requestId: request.id,
  ipAddress: request.ip,
  actorSessionId,
});

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly loginSession: LoginSessionUseCase,
    private readonly refreshSession: RefreshSessionUseCase,
    private readonly manageSessions: ManageSessionsUseCase,
    private readonly refreshCookie: RefreshCookieService,
    private readonly browserOrigins: BrowserOriginService,
    private readonly otp: OtpAuthenticationUseCase,
  ) {}

  @Post('otp/challenges')
  @Public()
  @ApiBrowserOrigin()
  @ApiOperation({ operationId: 'authOtpChallengeCreate', summary: 'Request an authentication OTP challenge' })
  @ApiCreatedResponse({ type: OtpChallengeResponseDto })
  async createOtpChallenge(@Body() body: CreateOtpChallengeDto, @Headers('idempotency-key') key: string | undefined, @Req() request: FastifyRequest) {
    this.browserOrigins.assertAllowed(getOrigin(request));
    return this.otp.request({ phone: body.phone, remember: body.remember ?? false, idempotencyKey: key, ipAddress: request.ip, userAgent: getUserAgent(request), requestId: request.id });
  }

  @Post('otp/challenges/:challengeId/resend')
  @Public()
  @ApiBrowserOrigin()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'authOtpChallengeResend', summary: 'Resend an authentication OTP challenge' })
  @ApiOkResponse({ type: OtpChallengeResponseDto })
  async resendOtpChallenge(@Param('challengeId', ParseUUIDPipe) challengeId: string, @Headers('idempotency-key') key: string | undefined, @Req() request: FastifyRequest) {
    this.browserOrigins.assertAllowed(getOrigin(request));
    return this.otp.resend(challengeId, key, { ipAddress: request.ip, userAgent: getUserAgent(request), requestId: request.id });
  }

  @Post('otp/challenges/:challengeId/verify')
  @Public()
  @ApiBrowserOrigin()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'authOtpChallengeVerify', summary: 'Verify OTP and create an authenticated session' })
  @ApiOkResponse({ type: AuthenticationResponseDto, headers: REFRESH_COOKIE_RESPONSE_HEADERS })
  async verifyOtpChallenge(@Param('challengeId', ParseUUIDPipe) challengeId: string, @Body() body: VerifyOtpChallengeDto, @Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply): Promise<AuthenticationResponseDto> {
    this.browserOrigins.assertAllowed(getOrigin(request));
    const result = await this.otp.verify(challengeId, body.code, { ipAddress: request.ip, userAgent: getUserAgent(request), requestId: request.id });
    this.refreshCookie.set(reply, result.refreshToken, result.refreshExpiresAt);
    return toResponse(result);
  }

  @Post('register')
  @Public()
  @ApiBrowserOrigin()
  @ApiOperation({
    operationId: 'authRegister',
    summary: 'Register a patient account',
  })
  @ApiCreatedResponse({ type: RegisterResponseDto })
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Request validation failed.')
  @ApiErrorResponse(HttpStatus.FORBIDDEN, 'Browser origin is not allowed.')
  @ApiErrorResponse(HttpStatus.CONFLICT, 'Phone number is already registered.')
  @ApiErrorResponse(
    HttpStatus.TOO_MANY_REQUESTS,
    'Registration rate limit exceeded.',
  )
  @ApiErrorResponse(
    HttpStatus.UNPROCESSABLE_ENTITY,
    'Phone or password is invalid.',
  )
  async register(
    @Body() body: RegisterRequestDto,
    @Req() request: FastifyRequest,
  ): Promise<RegisteredUser> {
    this.browserOrigins.assertAllowed(getOrigin(request));

    try {
      return await this.registerUser.execute({
        ...body,
        ...getAuditContext(request),
      });
    } catch (error) {
      if (error instanceof InvalidPhoneNumberError) {
        throw new UnprocessableEntityException({
          code: error.code,
          message: 'Phone number is invalid.',
          details: {},
        });
      }

      if (error instanceof PasswordPolicyError) {
        throw new UnprocessableEntityException({
          code: error.code,
          message: passwordErrorMessages[error.code],
          details: {},
        });
      }

      if (error instanceof PhoneAlreadyRegisteredError) {
        throw new ConflictException({
          code: 'PHONE_ALREADY_REGISTERED',
          message: error.message,
          details: {},
        });
      }

      if (error instanceof RegistrationRateLimitedError) {
        throw new HttpException({
          code: error.code,
          message: error.message,
          details: {},
        }, HttpStatus.TOO_MANY_REQUESTS);
      }

      throw error;
    }
  }

  @Post('login')
  @Public()
  @ApiBrowserOrigin()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'authLogin',
    summary: 'Create an authenticated session',
  })
  @ApiOkResponse({
    type: AuthenticationResponseDto,
    headers: REFRESH_COOKIE_RESPONSE_HEADERS,
  })
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Request validation failed.')
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Credentials are invalid.')
  @ApiErrorResponse(HttpStatus.FORBIDDEN, 'Browser origin is not allowed.')
  @ApiErrorResponse(
    HttpStatus.TOO_MANY_REQUESTS,
    'Login rate limit exceeded.',
  )
  async login(
    @Body() body: LoginRequestDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthenticationResponseDto> {
    this.browserOrigins.assertAllowed(getOrigin(request));

    try {
      const result = await this.loginSession.execute({
        phone: body.phone,
        password: body.password,
        remember: body.remember ?? false,
        ipAddress: request.ip,
        userAgent: getUserAgent(request),
        requestId: request.id,
      });
      this.refreshCookie.set(
        reply,
        result.refreshToken,
        result.refreshExpiresAt,
      );

      return toResponse(result);
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
          details: {},
        });
      }

      if (error instanceof LoginRateLimitedError) {
        throw new HttpException({
          code: error.code,
          message: error.message,
          details: {},
        }, HttpStatus.TOO_MANY_REQUESTS);
      }

      throw error;
    }
  }

  @Post('refresh')
  @Public()
  @ApiBrowserOrigin()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'authRefresh',
    summary: 'Rotate the refresh cookie and issue an access token',
  })
  @ApiCookieAuth('refreshCookie')
  @ApiOkResponse({
    type: AuthenticationResponseDto,
    headers: REFRESH_COOKIE_RESPONSE_HEADERS,
  })
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Refresh token is invalid.')
  @ApiErrorResponse(
    HttpStatus.CONFLICT,
    'A concurrent refresh has updated the browser cookie; retry shortly.',
  )
  @ApiErrorResponse(HttpStatus.FORBIDDEN, 'Browser origin is not allowed.')
  @ApiErrorResponse(
    HttpStatus.TOO_MANY_REQUESTS,
    'Refresh rate limit exceeded.',
  )
  async refresh(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthenticationResponseDto> {
    this.browserOrigins.assertAllowed(getOrigin(request));

    try {
      const result = await this.refreshSession.execute({
        refreshToken: this.refreshCookie.read(request),
        ipAddress: request.ip,
        userAgent: getUserAgent(request),
        requestId: request.id,
      });
      this.refreshCookie.set(
        reply,
        result.refreshToken,
        result.refreshExpiresAt,
      );

      return toResponse(result);
    } catch (error) {
      if (error instanceof ConcurrentRefreshError) {
        throw new ConflictException({
          code: error.code,
          message: error.message,
          details: {},
        });
      }

      if (error instanceof InvalidRefreshTokenError) {
        this.refreshCookie.clear(reply);
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
          details: {},
        });
      }

      if (error instanceof RefreshRateLimitedError) {
        throw new HttpException({
          code: error.code,
          message: error.message,
          details: {},
        }, HttpStatus.TOO_MANY_REQUESTS);
      }

      throw error;
    }
  }

  @Post('logout')
  @SkipActiveSessionCheck()
  @RequirePermissions(PERMISSIONS.SESSION_REVOKE_SELF)
  @ApiBrowserOrigin()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    operationId: 'authLogout',
    summary: 'Revoke the current session',
  })
  @ApiNoContentResponse({
    description: 'Current session was revoked.',
    headers: REFRESH_COOKIE_RESPONSE_HEADERS,
  })
  @ApiErrorResponse(
    HttpStatus.UNAUTHORIZED,
    'Access token is missing or invalid.',
  )
  @ApiErrorResponse(
    HttpStatus.FORBIDDEN,
    'Permission or browser origin is invalid.',
  )
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<void> {
    this.browserOrigins.assertAllowed(getOrigin(request));
    await this.manageSessions.logout(
      request.auth.userId,
      request.auth.sessionId,
      getAuditContext(request, request.auth.sessionId),
    );
    this.refreshCookie.clear(reply);
  }

  @Post('logout-all')
  @SkipActiveSessionCheck()
  @RequirePermissions(PERMISSIONS.SESSION_REVOKE_SELF)
  @ApiBrowserOrigin()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    operationId: 'authLogoutAll',
    summary: 'Revoke every session owned by the current user',
  })
  @ApiNoContentResponse({
    description: 'All user sessions were revoked.',
    headers: REFRESH_COOKIE_RESPONSE_HEADERS,
  })
  @ApiErrorResponse(
    HttpStatus.UNAUTHORIZED,
    'Access token is missing or invalid.',
  )
  @ApiErrorResponse(
    HttpStatus.FORBIDDEN,
    'Permission or browser origin is invalid.',
  )
  async logoutAll(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<void> {
    this.browserOrigins.assertAllowed(getOrigin(request));
    await this.manageSessions.logoutAll(
      request.auth.userId,
      getAuditContext(request, request.auth.sessionId),
    );
    this.refreshCookie.clear(reply);
  }

  @Get('sessions')
  @RequirePermissions(PERMISSIONS.SESSION_READ_SELF)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    operationId: 'authListSessions',
    summary: 'List active sessions owned by the current user',
  })
  @ApiOkResponse({ type: SessionListResponseDto })
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Pagination query is invalid.')
  @ApiErrorResponse(
    HttpStatus.UNAUTHORIZED,
    'Access token is missing or invalid.',
  )
  @ApiErrorResponse(HttpStatus.FORBIDDEN, 'Required permission is missing.')
  async sessions(
    @Req() request: AuthenticatedRequest,
    @Query() query: SessionListQueryDto,
  ): Promise<SessionListResult> {
    return this.manageSessions.list(
      request.auth.userId,
      request.auth.sessionId,
      query.page,
      query.limit,
    );
  }

  @Delete('sessions/:id')
  @RequirePermissions(PERMISSIONS.SESSION_REVOKE_SELF)
  @ApiBrowserOrigin()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    operationId: 'authRevokeSession',
    summary: 'Revoke an owned session',
  })
  @ApiNoContentResponse({
    description: 'Owned session was revoked.',
    headers: REFRESH_COOKIE_RESPONSE_HEADERS,
  })
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Session id is invalid.')
  @ApiErrorResponse(
    HttpStatus.UNAUTHORIZED,
    'Access token is missing or invalid.',
  )
  @ApiErrorResponse(
    HttpStatus.FORBIDDEN,
    'Permission or browser origin is invalid.',
  )
  async revokeSession(
    @Param('id', new ParseUUIDPipe({ version: '4' })) sessionId: string,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<void> {
    this.browserOrigins.assertAllowed(getOrigin(request));
    await this.manageSessions.revoke(
      request.auth.userId,
      sessionId,
      getAuditContext(request, request.auth.sessionId),
    );

    if (sessionId === request.auth.sessionId) {
      this.refreshCookie.clear(reply);
    }
  }
}
