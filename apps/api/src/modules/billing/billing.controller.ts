import { Body, CanActivate, Controller, ExecutionContext, Get, Headers, HttpException, Injectable, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiHeader, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../common/auth/authorization.policy';
import { PublicAuthRateLimiter } from '../identity/application/ports/public-auth-rate-limiter';
import { BillingService } from './billing.service';
import { BillingGatewayService } from './billing-gateway.service';
import { WalletService } from './wallet.service';
import { BillingReportingService } from './billing-reporting.service';
import { financialKey } from './billing.policy';
import { AdminBillingIntentDto, BillingAdminQuery, BillingAppointmentIntentDto, BillingGatewayAttemptDto, BillingIntentDto, BillingIntentPageDto, BillingOrderIntentDto, BillingPageQuery, BillingReconciliationPageDto, BillingRefundCompleteDto, BillingRefundDto, BillingRefundRequestDto, BillingSummaryDto, WalletAdjustmentDto, WalletAdjustmentResultDto, WalletAmountDto, WalletStatusDto, WalletStatusResultDto, WalletSummaryDto, WalletTransactionPageDto } from './billing.dto';

const context = (request: AuthenticatedRequest) => ({ actorUserId: request.auth.userId, actorSessionId: request.auth.sessionId, requestId: request.id, ipAddress: request.ip });
const uuid = () => new ParseUUIDPipe({ version: '4' });

@Injectable()
export class BillingRateGuard implements CanActivate {
  constructor(private readonly limiter: PublicAuthRateLimiter) {}
  async canActivate(ctx: ExecutionContext) {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const allowed = await this.limiter.consume({ scope: request.method === 'GET' ? 'billing-read' : 'billing-write', subjects: [{ kind: 'user', value: request.auth.userId, limit: request.method === 'GET' ? 120 : 30 }], windowMs: 60_000, at: new Date() });
    if (!allowed) throw new HttpException({ code: 'BILLING_RATE_LIMITED', message: 'Financial request rate limit exceeded.', details: {} }, 429);
    return true;
  }
}

@ApiTags('Patient Wallet and Billing') @ApiBearerAuth('bearerAuth') @RequireRoles('PATIENT') @UseGuards(BillingRateGuard) @Controller('patients/me')
export class PatientBillingController {
  constructor(private readonly wallet: WalletService, private readonly billing: BillingService, private readonly gateway: BillingGatewayService) {}
  @Get('wallet') @RequirePermissions(PERMISSIONS.WALLET_READ_SELF) @ApiOperation({ operationId: 'patientWalletGet' }) @ApiOkResponse({ type: WalletSummaryDto })
  async summary(@Req() req: AuthenticatedRequest) { return this.wallet.summary(await this.wallet.patient(req.auth.userId)); }
  @Get('wallet/transactions') @RequirePermissions(PERMISSIONS.WALLET_READ_SELF) @ApiOperation({ operationId: 'patientWalletTransactionsList' }) @ApiOkResponse({ type: WalletTransactionPageDto })
  async history(@Req() req: AuthenticatedRequest, @Query() query: BillingPageQuery) { return this.wallet.transactions(await this.wallet.patient(req.auth.userId), query.page, query.pageSize); }
  @Post('wallet/topups') @RequirePermissions(PERMISSIONS.WALLET_WRITE_SELF) @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiOperation({ operationId: 'patientWalletTopupCreate' }) @ApiCreatedResponse({ type: BillingIntentDto })
  topup(@Req() req: AuthenticatedRequest, @Body() body: WalletAmountDto, @Headers('idempotency-key') key?: string) { return this.billing.create(req.auth.userId, 'TOPUP', { amountToman: body.amountToman }, key, context(req)); }
  @Post('billing/order-intents') @RequirePermissions(PERMISSIONS.WALLET_WRITE_SELF) @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiOperation({ operationId: 'patientOrderBillingIntentCreate' }) @ApiCreatedResponse({ type: BillingIntentDto })
  order(@Req() req: AuthenticatedRequest, @Body() body: BillingOrderIntentDto, @Headers('idempotency-key') key?: string) { return this.billing.create(req.auth.userId, 'ORDER', { orderId: body.orderId }, key, context(req)); }
  @Post('billing/appointment-intents') @RequirePermissions(PERMISSIONS.APPOINTMENTS_CREATE_SELF, PERMISSIONS.WALLET_WRITE_SELF) @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiOperation({ operationId: 'patientAppointmentBillingIntentCreate' }) @ApiCreatedResponse({ type: BillingIntentDto })
  appointment(@Req() req: AuthenticatedRequest, @Body() body: BillingAppointmentIntentDto, @Headers('idempotency-key') key?: string) { return this.billing.create(req.auth.userId, 'APPOINTMENT', { doctorServiceId: body.doctorServiceId, startsAt: body.startsAt }, key, context(req)); }
  @Get('billing/intents/:id') @RequirePermissions(PERMISSIONS.WALLET_READ_SELF) @ApiOperation({ operationId: 'patientBillingIntentGet' }) @ApiOkResponse({ type: BillingIntentDto })
  async get(@Req() req: AuthenticatedRequest, @Param('id', uuid()) id: string) { return { ...await this.billing.get(req.auth.userId, id), methods: await this.gateway.methods(req.auth.userId, id) }; }
  @Post('billing/intents/:id/cancel') @RequirePermissions(PERMISSIONS.WALLET_WRITE_SELF) @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiOperation({ operationId: 'patientBillingIntentCancel' }) @ApiCreatedResponse({ type: BillingIntentDto })
  cancel(@Req() req: AuthenticatedRequest, @Param('id', uuid()) id: string, @Headers('idempotency-key') key?: string) { return this.billing.cancel(req.auth.userId, id, key, context(req)); }
  @Post('billing/intents/:id/wallet-payment') @RequirePermissions(PERMISSIONS.WALLET_WRITE_SELF) @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiOperation({ operationId: 'patientBillingWalletPay' }) @ApiCreatedResponse({ type: BillingIntentDto })
  pay(@Req() req: AuthenticatedRequest, @Param('id', uuid()) id: string, @Headers('idempotency-key') key?: string) { return this.billing.payWallet(req.auth.userId, id, key, context(req)); }
  @Post('billing/intents/:id/gateway-attempts') @RequirePermissions(PERMISSIONS.WALLET_WRITE_SELF) @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiOperation({ operationId: 'patientBillingGatewayAttemptCreate' }) @ApiCreatedResponse({ type: BillingGatewayAttemptDto })
  gatewayAttempt(@Req() req: AuthenticatedRequest, @Param('id', uuid()) id: string, @Headers('idempotency-key') key?: string) { return this.gateway.create(req.auth.userId, id, key, context(req)); }
}

@ApiTags('Admin Patient Wallet') @ApiBearerAuth('bearerAuth') @RequireRoles('ADMIN') @UseGuards(BillingRateGuard) @Controller('admin/patients/:patientId/wallet')
export class AdminPatientWalletController {
  constructor(private readonly wallet: WalletService, private readonly billing: BillingService) {}
  @Post('appointment-intents') @RequirePermissions(PERMISSIONS.BILLING_MANAGE) @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiOperation({ operationId: 'adminPatientAppointmentBillingIntentCreate' }) @ApiCreatedResponse({ type: BillingIntentDto })
  async appointment(@Req() req: AuthenticatedRequest, @Param('patientId', uuid()) id: string, @Body() body: BillingAppointmentIntentDto, @Headers('idempotency-key') key?: string) {
    const patient = await this.wallet.adminPatient(req.auth.userId, id);
    return this.billing.create(patient.userId, 'APPOINTMENT', { doctorServiceId: body.doctorServiceId, startsAt: body.startsAt }, key, context(req));
  }
  @Get() @RequirePermissions(PERMISSIONS.WALLET_READ) @ApiOperation({ operationId: 'adminPatientWalletGet' }) @ApiOkResponse({ type: WalletSummaryDto })
  async summary(@Req() req: AuthenticatedRequest, @Param('patientId', uuid()) id: string) { return this.wallet.summary(await this.wallet.adminPatient(req.auth.userId, id)); }
  @Get('transactions') @RequirePermissions(PERMISSIONS.WALLET_READ) @ApiOperation({ operationId: 'adminPatientWalletTransactionsList' }) @ApiOkResponse({ type: WalletTransactionPageDto })
  async history(@Req() req: AuthenticatedRequest, @Param('patientId', uuid()) id: string, @Query() query: BillingPageQuery) { return this.wallet.transactions(await this.wallet.adminPatient(req.auth.userId, id), query.page, query.pageSize, true); }
  @Post('adjustments') @RequirePermissions(PERMISSIONS.WALLET_ADJUST) @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiOperation({ operationId: 'adminPatientWalletAdjust' }) @ApiCreatedResponse({ type: WalletAdjustmentResultDto })
  adjust(@Req() req: AuthenticatedRequest, @Param('patientId', uuid()) id: string, @Body() body: WalletAdjustmentDto, @Headers('idempotency-key') key?: string) { return this.wallet.adjust(context(req), id, body, key); }
  @Post('status') @RequirePermissions(PERMISSIONS.WALLET_ADJUST) @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiOperation({ operationId: 'adminPatientWalletStatusSet' }) @ApiCreatedResponse({ type: WalletStatusResultDto })
  status(@Req() req: AuthenticatedRequest, @Param('patientId', uuid()) id: string, @Body() body: WalletStatusDto, @Headers('idempotency-key') key?: string) { return this.wallet.setStatus(context(req), id, body, key); }
}

@ApiTags('Admin Billing Operations') @ApiBearerAuth('bearerAuth') @RequireRoles('ADMIN') @RequirePermissions(PERMISSIONS.BILLING_MANAGE) @UseGuards(BillingRateGuard) @Controller('admin/billing')
export class AdminBillingController {
  constructor(private readonly billing: BillingService, private readonly gateway: BillingGatewayService, private readonly reporting: BillingReportingService) {}
  @Get('intents') @ApiOperation({ operationId: 'adminBillingIntentsList' }) @ApiOkResponse({ type: BillingIntentPageDto })
  intents(@Req() req: AuthenticatedRequest, @Query() query: BillingAdminQuery) { return this.reporting.intents(req.auth.userId, query); }
  @Get('intents/:id') @ApiOperation({ operationId: 'adminBillingIntentGet' }) @ApiOkResponse({ type: AdminBillingIntentDto })
  intent(@Req() req: AuthenticatedRequest, @Param('id', uuid()) id: string) { return this.billing.adminGet(req.auth.userId, id); }
  @Get('reconciliation') @ApiOperation({ operationId: 'adminBillingReconciliationList' }) @ApiOkResponse({ type: BillingReconciliationPageDto })
  reconciliation(@Req() req: AuthenticatedRequest, @Query() query: BillingPageQuery) { return this.reporting.reconciliation(req.auth.userId, query); }
  @Get('summary') @ApiOperation({ operationId: 'adminBillingSummaryGet' }) @ApiOkResponse({ type: BillingSummaryDto })
  summary(@Req() req: AuthenticatedRequest) { return this.reporting.summary(req.auth.userId); }
  @Post('intents/:id/refunds') @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiOperation({ operationId: 'adminBillingRefundCreate' }) @ApiCreatedResponse({ type: BillingRefundDto })
  refund(@Req() req: AuthenticatedRequest, @Param('id', uuid()) id: string, @Body() body: BillingRefundRequestDto, @Headers('idempotency-key') key?: string) { return this.billing.refund(context(req), id, body.amountRial, body.reason, key); }
  @Post('refunds/:id/complete') @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiOperation({ operationId: 'adminBillingRefundComplete' }) @ApiCreatedResponse({ type: BillingRefundDto })
  complete(@Req() req: AuthenticatedRequest, @Param('id', uuid()) id: string, @Body() body: BillingRefundCompleteDto, @Headers('idempotency-key') key?: string) { financialKey(key); return this.billing.completeRefund(context(req), id, body.evidenceReference); }
  @Post('attempts/:id/retry') @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiOperation({ operationId: 'adminBillingAttemptRetry' }) @ApiCreatedResponse({ type: BillingGatewayAttemptDto })
  retry(@Req() req: AuthenticatedRequest, @Param('id', uuid()) id: string, @Headers('idempotency-key') key?: string) { financialKey(key); return this.gateway.retry(req.auth.userId, id); }
  @Post('attempts/:id/resolve-failed') @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiOperation({ operationId: 'adminBillingAttemptResolveFailed', summary: 'Resolve an ambiguous attempt as failed using reviewed non-sensitive evidence; never manually mark a bank payment successful' }) @ApiCreatedResponse({ type: BillingGatewayAttemptDto })
  resolveFailed(@Req() req: AuthenticatedRequest, @Param('id', uuid()) id: string, @Body() body: BillingRefundCompleteDto, @Headers('idempotency-key') key?: string) { return this.gateway.resolveFailed(context(req), id, body.evidenceReference, key); }
}
