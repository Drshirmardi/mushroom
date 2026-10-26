import { Body, Controller, Get, Headers, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { RequirePermissions } from '../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../common/auth/authorization.policy';
import { CreatePaymentProviderRevisionDto, PaymentProviderConfigDto, UpdatePaymentProviderConfigDto } from './payment-provider.dto';
import { PaymentProviderConfigService } from './payment-provider-config.service';
import { PaymentGatewayDiagnosticsService } from './payment-gateway-diagnostics.service';
import { PaymentGatewayRequestDetailDto, PaymentGatewayRequestsPageDto, PaymentGatewayRequestsQueryDto } from './payment-gateway-diagnostics.dto';

@ApiTags('Admin Commerce Payment Providers') @ApiBearerAuth('bearerAuth') @RequirePermissions(PERMISSIONS.COMMERCE_MANAGE) @Controller('admin/commerce/payment-providers')
export class AdminPaymentProviderController {
  constructor(private readonly configs: PaymentProviderConfigService, private readonly diagnostics: PaymentGatewayDiagnosticsService) {}
  @Get(':providerCode/requests') @RequirePermissions(PERMISSIONS.BILLING_MANAGE) @ApiOperation({ operationId: 'adminPaymentGatewayRequests', summary: 'Search secret-free gateway attempts within administrator clinic membership' }) @ApiOkResponse({ type: PaymentGatewayRequestsPageDto }) requests(@Param('providerCode') code: string, @Query() query: PaymentGatewayRequestsQueryDto, @Req() request: AuthenticatedRequest) { return this.diagnostics.list(request.auth.userId, code, query); }
  @Get(':providerCode/requests/:source/:attemptId') @RequirePermissions(PERMISSIONS.BILLING_MANAGE) @ApiOperation({ operationId: 'adminPaymentGatewayRequestDetail', summary: 'Read safe adapter events for a clinic-owned payment attempt' }) @ApiOkResponse({ type: PaymentGatewayRequestDetailDto }) requestDetail(@Param('providerCode') code: string, @Param('source') source: string, @Param('attemptId', new ParseUUIDPipe({ version: '4' })) id: string, @Req() request: AuthenticatedRequest) { return this.diagnostics.detail(request.auth.userId, code, source, id); }
  @Get() @ApiOperation({ operationId: 'adminCommercePaymentProvidersList', summary: 'List code-owned clinic payment provider configurations without credentials' }) @ApiOkResponse({ type: PaymentProviderConfigDto, isArray: true }) list() { return this.configs.list(); }
  @Post(':providerCode/config-revisions') @ApiOperation({ operationId: 'adminCommercePaymentProviderRevisionCreate', summary: 'Create an idempotent write-only encrypted provider configuration revision' }) @ApiCreatedResponse({ type: PaymentProviderConfigDto }) create(@Param('providerCode') code: string, @Headers('idempotency-key') key: string | undefined, @Body() body: CreatePaymentProviderRevisionDto, @Req() request: AuthenticatedRequest) { return this.configs.createRevision(code, key, body, this.context(request)); }
  @Patch(':providerCode') @ApiOperation({ operationId: 'adminCommercePaymentProviderUpdate', summary: 'Update a provider enabled/default state subject to its go-live gate' }) @ApiOkResponse({ type: PaymentProviderConfigDto }) update(@Param('providerCode') code: string, @Body() body: UpdatePaymentProviderConfigDto, @Req() request: AuthenticatedRequest) { return this.configs.update(code, body, this.context(request)); }
  private context(request: AuthenticatedRequest) { return { actorUserId: request.auth.userId, actorSessionId: request.auth.sessionId, requestId: request.id, ipAddress: request.ip }; }
}
