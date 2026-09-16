import { Body, Controller, Get, Headers, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { RequirePermissions } from '../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../common/auth/authorization.policy';
import { CreatePaymentProviderRevisionDto, PaymentProviderConfigDto, UpdatePaymentProviderConfigDto } from './payment-provider.dto';
import { PaymentProviderConfigService } from './payment-provider-config.service';

@ApiTags('Admin Commerce Payment Providers') @ApiBearerAuth('bearerAuth') @RequirePermissions(PERMISSIONS.COMMERCE_MANAGE) @Controller('admin/commerce/payment-providers')
export class AdminPaymentProviderController {
  constructor(private readonly configs: PaymentProviderConfigService) {}
  @Get() @ApiOperation({ operationId: 'adminCommercePaymentProvidersList', summary: 'List code-owned clinic payment provider configurations without credentials' }) @ApiOkResponse({ type: PaymentProviderConfigDto, isArray: true }) list() { return this.configs.list(); }
  @Post(':providerCode/config-revisions') @ApiOperation({ operationId: 'adminCommercePaymentProviderRevisionCreate', summary: 'Create an idempotent write-only encrypted provider configuration revision' }) @ApiCreatedResponse({ type: PaymentProviderConfigDto }) create(@Param('providerCode') code: string, @Headers('idempotency-key') key: string | undefined, @Body() body: CreatePaymentProviderRevisionDto, @Req() request: AuthenticatedRequest) { return this.configs.createRevision(code, key, body, this.context(request)); }
  @Patch(':providerCode') @ApiOperation({ operationId: 'adminCommercePaymentProviderUpdate', summary: 'Update a provider enabled/default state subject to its go-live gate' }) @ApiOkResponse({ type: PaymentProviderConfigDto }) update(@Param('providerCode') code: string, @Body() body: UpdatePaymentProviderConfigDto, @Req() request: AuthenticatedRequest) { return this.configs.update(code, body, this.context(request)); }
  private context(request: AuthenticatedRequest) { return { actorUserId: request.auth.userId, actorSessionId: request.auth.sessionId, requestId: request.id, ipAddress: request.ip }; }
}
