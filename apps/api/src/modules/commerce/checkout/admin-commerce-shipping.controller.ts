import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../common/auth/authorization.policy';
import { CommerceCourierShippingRateDto, UpdateCourierShippingRateDto } from './commerce-checkout.dto';
import { CommerceCheckoutService } from './commerce-checkout.service';

@ApiTags('Admin Commerce') @ApiBearerAuth('bearerAuth') @RequireRoles('ADMIN') @RequirePermissions(PERMISSIONS.COMMERCE_MANAGE) @Controller('admin/commerce/shipping-rates')
export class AdminCommerceShippingController {
  constructor(private readonly commerce: CommerceCheckoutService) {}
  @Get('courier') @ApiOperation({ operationId: 'adminCommerceCourierShippingRateGet', summary: 'Get the active clinic courier shipping rate configuration' }) @ApiOkResponse({ type: CommerceCourierShippingRateDto }) rate() { return this.commerce.adminCourierRate(); }
  @Patch('courier') @ApiOperation({ operationId: 'adminCommerceCourierShippingRateUpdate', summary: 'Update the clinic courier rate without changing historical order snapshots' }) @ApiOkResponse({ type: CommerceCourierShippingRateDto }) update(@Req() request: AuthenticatedRequest, @Body() body: UpdateCourierShippingRateDto) { return this.commerce.updateCourierRate(body, { actorUserId: request.auth.userId, actorSessionId: request.auth.sessionId, requestId: request.id, ipAddress: request.ip }); }
}
