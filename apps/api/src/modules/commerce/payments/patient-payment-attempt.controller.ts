import { Controller, Get, Headers, HttpCode, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../common/auth/authorization.policy';
import { PaymentAttemptDto } from './payment-provider.dto';
import { PaymentAttemptService } from './payment-attempt.service';
import { Public } from '../../../common/auth/public.decorator';

@ApiTags('Patient Payments') @ApiBearerAuth('bearerAuth') @RequireRoles('PATIENT') @Controller('patients/me')
export class PatientPaymentAttemptController {
  constructor(private readonly attempts: PaymentAttemptService) {}
  @Post('orders/:orderId/payment-attempts') @RequirePermissions(PERMISSIONS.COMMERCE_WRITE_SELF) @ApiOperation({ operationId: 'patientPaymentAttemptCreate', summary: 'Create a provider-bound payment attempt when a go-live-ready provider is available' }) @ApiCreatedResponse({ type: PaymentAttemptDto }) create(@Req() request: AuthenticatedRequest, @Param('orderId', new ParseUUIDPipe({ version: '4' })) orderId: string, @Headers('idempotency-key') key: string | undefined) { return this.attempts.createForOrder(request.auth.userId, orderId, key); }
  @Get('payment-attempts/:attemptId') @RequirePermissions(PERMISSIONS.COMMERCE_READ_SELF) @ApiOperation({ operationId: 'patientPaymentAttemptGet', summary: 'Get a signed-in patient payment attempt' }) @ApiOkResponse({ type: PaymentAttemptDto }) get(@Req() request: AuthenticatedRequest, @Param('attemptId', new ParseUUIDPipe({ version: '4' })) attemptId: string) { return this.attempts.get(request.auth.userId, attemptId); }
}

@ApiTags('Provider Callbacks') @Controller('payments/providers/sadad')
export class SadadCallbackController {
  constructor(private readonly attempts: PaymentAttemptService) {}
  @Public()
  @Post('callback') @HttpCode(503) @ApiOperation({ operationId: 'sadadPaymentCallback', summary: 'Dormant Sadad callback endpoint; transport activation awaits merchant acceptance evidence' }) callback() { return this.attempts.callbackDisabled(); }
}
