import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../common/auth/authorization.policy';
import {
  CommerceCustomerCrmPageDto,
  CommerceCustomerCrmQueryDto,
} from './commerce-customer-crm.dto';
import { CommerceCustomerCrmService } from './commerce-customer-crm.service';

@ApiTags('Admin Commerce Customers')
@ApiBearerAuth('bearerAuth')
@RequireRoles('ADMIN')
@RequirePermissions(PERMISSIONS.COMMERCE_MANAGE)
@Controller('admin/commerce/customers')
export class AdminCommerceCustomerCrmController {
  constructor(private readonly customers: CommerceCustomerCrmService) {}

  @Get()
  @ApiOperation({
    operationId: 'adminCommerceCustomersList',
    summary: 'List clinic-scoped operational store customers without medical or marketing data',
  })
  @ApiOkResponse({ type: CommerceCustomerCrmPageDto })
  list(
    @Query() query: CommerceCustomerCrmQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.customers.list(query, {
      actorUserId: request.auth.userId,
      actorSessionId: request.auth.sessionId,
      requestId: request.id,
      ipAddress: request.ip,
    });
  }
}
