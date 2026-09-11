import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { RequirePermissions } from '../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../common/auth/authorization.policy';
import { CommerceDiscountService } from './commerce-discount.service';
import { CommerceDiscountResponseDto, CreateCommerceDiscountDto, UpdateCommerceDiscountDto } from './commerce-discount.dto';

@ApiTags('Admin Commerce Discounts') @ApiBearerAuth('bearerAuth') @Controller('admin/commerce/discounts') @RequirePermissions(PERMISSIONS.COMMERCE_MANAGE)
export class AdminCommerceDiscountController {
  constructor(private readonly discounts: CommerceDiscountService) {}
  @Get() @ApiOperation({ operationId: 'adminCommerceDiscountsList', summary: 'List clinic-scoped commerce discounts and usage' }) @ApiOkResponse({ type: CommerceDiscountResponseDto, isArray: true }) list() { return this.discounts.list(); }
  @Post() @ApiOperation({ operationId: 'adminCommerceDiscountsCreate', summary: 'Create a clinic-scoped commerce discount' }) @ApiCreatedResponse({ type: CommerceDiscountResponseDto }) create(@Body() body: CreateCommerceDiscountDto, @Req() request: AuthenticatedRequest) { return this.discounts.create(body, this.context(request)); }
  @Patch(':discountId') @ApiOperation({ operationId: 'adminCommerceDiscountsUpdate', summary: 'Update or activate a commerce discount without changing its code' }) @ApiParam({ name: 'discountId', format: 'uuid' }) @ApiOkResponse({ type: CommerceDiscountResponseDto }) update(@Param('discountId', new ParseUUIDPipe({ version: '4' })) id: string, @Body() body: UpdateCommerceDiscountDto, @Req() request: AuthenticatedRequest) { return this.discounts.update(id, body, this.context(request)); }
  private context(request: AuthenticatedRequest) { return { actorUserId: request.auth.userId, actorSessionId: request.auth.sessionId, requestId: request.id, ipAddress: request.ip }; }
}
