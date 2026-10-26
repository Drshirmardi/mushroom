import { randomBytes } from 'node:crypto';
import { SadadRuntimeConfigService } from './sadad-runtime-config.service';
import { sadadStartDocument } from './sadad-browser-start';
import { Body, Controller, Get, Headers, HttpException, HttpStatus, Param, ParseUUIDPipe, Post, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../common/auth/authorization.policy';
import { PaymentAttemptDto } from './payment-provider.dto';
import { PaymentAttemptService } from './payment-attempt.service';
import { Public } from '../../../common/auth/public.decorator';
import { PublicAuthRateLimiter } from '../../identity/application/ports/public-auth-rate-limiter';

@ApiTags('Patient Payments') @ApiBearerAuth('bearerAuth') @RequireRoles('PATIENT') @Controller('patients/me')
export class PatientPaymentAttemptController {
  constructor(private readonly attempts: PaymentAttemptService) {}
  @Post('orders/:orderId/payment-attempts') @RequirePermissions(PERMISSIONS.COMMERCE_WRITE_SELF) @ApiOperation({ operationId: 'patientPaymentAttemptCreate', summary: 'Create a provider-bound payment attempt when a go-live-ready provider is available' }) @ApiCreatedResponse({ type: PaymentAttemptDto }) create(@Req() request: AuthenticatedRequest, @Param('orderId', new ParseUUIDPipe({ version: '4' })) orderId: string, @Headers('idempotency-key') key: string | undefined) { return this.attempts.createForOrder(request.auth.userId, orderId, key); }
  @Get('payment-attempts/:attemptId') @RequirePermissions(PERMISSIONS.COMMERCE_READ_SELF) @ApiOperation({ operationId: 'patientPaymentAttemptGet', summary: 'Get a signed-in patient payment attempt' }) @ApiOkResponse({ type: PaymentAttemptDto }) get(@Req() request: AuthenticatedRequest, @Param('attemptId', new ParseUUIDPipe({ version: '4' })) attemptId: string) { return this.attempts.get(request.auth.userId, attemptId); }
}

@ApiTags('Provider Callbacks') @Controller('payments/providers/sadad')
export class SadadCallbackController {
  constructor(private readonly attempts: PaymentAttemptService, private readonly rateLimiter: PublicAuthRateLimiter, private readonly runtime: SadadRuntimeConfigService) {}
  @Public()
  @Get('start')
  @ApiOperation({ operationId: 'sadadPaymentBrowserStart', summary: 'Render a merchant-origin document before navigating to the fixed Sadad payment page; token is supplied only in the browser fragment' })
  @ApiResponse({ status: 200, description: 'HTML payment navigation document', content: { 'text/html': { schema: { type: 'string' } } } })
  @ApiResponse({ status: 429, description: 'Payment start rate limit exceeded.' })
  async start(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    const allowed = await this.rateLimiter.consume({ scope: 'sadad-start', subjects: [{ kind: 'ip', value: request.ip, limit: 120 }], windowMs: 60_000, at: new Date() });
    if (!allowed) throw new HttpException({ code: 'PAYMENT_START_RATE_LIMITED', message: 'Payment start rate limit exceeded.', details: {} }, HttpStatus.TOO_MANY_REQUESTS);
    const nonce = randomBytes(24).toString('base64');
    const html = sadadStartDocument(this.runtime.settings().redirectProfile, nonce);
    return reply.type('text/html; charset=utf-8')
      .header('Cache-Control', 'no-store')
      .header('Referrer-Policy', 'origin')
      .header('X-Content-Type-Options', 'nosniff')
      .header('Content-Security-Policy', "default-src 'none'; script-src 'nonce-" + nonce + "'; base-uri 'none'; frame-ancestors 'none'; form-action https://sadad.shaparak.ir")
      .send(html);
  }
  @Public()
  @Post('callback')
  @ApiConsumes('application/x-www-form-urlencoded')
  @ApiBody({ schema: { type: 'object', required: ['OrderId', 'Token', 'ResCode'], properties: { OrderId: { type: 'string' }, Token: { type: 'string' }, ResCode: { type: 'string' } } } })
  @ApiResponse({ status: 429, description: 'Callback rate limit exceeded.' })
  @ApiOperation({ operationId: 'sadadPaymentCallback', summary: 'Validate a Sadad browser callback, Verify server-to-server and redirect to the app result page' })
  async callback(@Body() body: Record<string, unknown>, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    const orderId = typeof body.OrderId === 'string' && body.OrderId.length <= 512 ? body.OrderId : null;
    const allowed = await this.rateLimiter.consume({ scope: 'sadad-callback', subjects: [{ kind: 'ip', value: request.ip, limit: 120 }, ...(orderId ? [{ kind: 'order', value: orderId, limit: 12 }] : [])], windowMs: 60_000, at: new Date() });
    if (!allowed) throw new HttpException({ code: 'PAYMENT_CALLBACK_RATE_LIMITED', message: 'Payment callback rate limit exceeded.', details: {} }, HttpStatus.TOO_MANY_REQUESTS);
    const result = await this.attempts.processSadadCallback(body);
    return reply.code(303).redirect(result.redirectUrl);
  }
}
