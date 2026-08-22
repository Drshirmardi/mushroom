import {
  Body,
  ConflictException,
  Controller,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import { ACCESS_TOKEN_TTL_SECONDS } from '../../../../common/auth/access-token.service';
import { BrowserOriginService } from '../../../../common/auth/browser-origin.service';
import { Public } from '../../../../common/auth/public.decorator';
import { RefreshCookieService } from '../../../../common/auth/refresh-cookie.service';
import {
  LoginSessionUseCase,
  type SessionAuthenticationResult,
} from '../../application/login-session.use-case';
import {
  InvalidCredentialsError,
  LoginRateLimitedError,
} from '../../application/login-user.use-case';
import {
  InvalidRefreshTokenError,
  RefreshSessionUseCase,
} from '../../application/refresh-session.use-case';
import {
  RegisterUserUseCase,
  type RegisteredUser,
} from '../../application/register-user.use-case';
import { PhoneAlreadyRegisteredError } from '../../application/ports/registration.repository';
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

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly loginSession: LoginSessionUseCase,
    private readonly refreshSession: RefreshSessionUseCase,
    private readonly refreshCookie: RefreshCookieService,
    private readonly browserOrigins: BrowserOriginService,
  ) {}

  @Post('register')
  @Public()
  @ApiCreatedResponse({ type: RegisterResponseDto })
  @ApiConflictResponse({ description: 'Phone number is already registered.' })
  @ApiUnprocessableEntityResponse({ description: 'Phone or password is invalid.' })
  async register(
    @Body() body: RegisterRequestDto,
    @Headers('origin') origin?: string,
  ): Promise<RegisteredUser> {
    this.browserOrigins.assertAllowed(origin);

    try {
      return await this.registerUser.execute(body);
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

      throw error;
    }
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthenticationResponseDto })
  @ApiUnauthorizedResponse({ description: 'Credentials are invalid.' })
  @ApiTooManyRequestsResponse({ description: 'Login rate limit exceeded.' })
  async login(
    @Body() body: LoginRequestDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Headers('origin') origin?: string,
  ): Promise<AuthenticationResponseDto> {
    this.browserOrigins.assertAllowed(origin);

    try {
      const result = await this.loginSession.execute({
        phone: body.phone,
        password: body.password,
        remember: body.remember ?? false,
        ipAddress: request.ip,
        userAgent: getUserAgent(request),
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
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthenticationResponseDto })
  @ApiUnauthorizedResponse({ description: 'Refresh token is invalid.' })
  async refresh(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Headers('origin') origin?: string,
  ): Promise<AuthenticationResponseDto> {
    this.browserOrigins.assertAllowed(origin);

    try {
      const result = await this.refreshSession.execute({
        refreshToken: this.refreshCookie.read(request),
        ipAddress: request.ip,
        userAgent: getUserAgent(request),
      });
      this.refreshCookie.set(
        reply,
        result.refreshToken,
        result.refreshExpiresAt,
      );

      return toResponse(result);
    } catch (error) {
      if (error instanceof InvalidRefreshTokenError) {
        this.refreshCookie.clear(reply);
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
          details: {},
        });
      }

      throw error;
    }
  }
}
