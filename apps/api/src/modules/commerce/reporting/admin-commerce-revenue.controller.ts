import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions, RequireRoles } from '../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../common/auth/authorization.policy';
import { CommerceRevenueDto, CommerceRevenueQueryDto } from './commerce-revenue.dto';
import { CommerceRevenueService } from './commerce-revenue.service';
@ApiTags('Admin Commerce Revenue') @ApiBearerAuth('bearerAuth') @RequireRoles('ADMIN') @RequirePermissions(PERMISSIONS.COMMERCE_MANAGE) @Controller('admin/commerce/revenue')
export class AdminCommerceRevenueController { constructor(private readonly revenue: CommerceRevenueService) {} @Get() @ApiOperation({ operationId: 'adminCommerceRevenueGet', summary: 'Read authoritative commerce revenue from verified payments and completed refunds' }) @ApiOkResponse({ type: CommerceRevenueDto }) get(@Query() query: CommerceRevenueQueryDto) { return this.revenue.report(query); } }
