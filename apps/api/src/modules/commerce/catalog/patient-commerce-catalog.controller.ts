import { Controller, Get, Param, ParseUUIDPipe, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions, RequireRoles } from '../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../common/auth/authorization.policy';
import { ApiErrorResponse } from '../../../common/errors/api-error-response.decorator';
import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { PatientCommerceCatalogService } from './patient-commerce-catalog.service';
import { PatientCommerceListQueryDto, PatientCommerceProductDto, PatientCommerceProductPageDto } from './patient-commerce-catalog.dto';

@ApiTags('Patient Commerce Catalog') @ApiBearerAuth('bearerAuth') @RequireRoles('PATIENT') @RequirePermissions(PERMISSIONS.COMMERCE_READ_SELF) @Controller('commerce/products')
export class PatientCommerceCatalogController {
  constructor(private readonly catalog: PatientCommerceCatalogService) {}
  @Get() @ApiOperation({ operationId: 'patientCommerceProductsList', summary: 'List active commerce products with active SKUs in the patient clinic' }) @ApiOkResponse({ type: PatientCommerceProductPageDto }) list(@Req() request: AuthenticatedRequest, @Query() query: PatientCommerceListQueryDto) { return this.catalog.list(request.auth.userId, query); }
  @Get(':productId') @ApiOperation({ operationId: 'patientCommerceProductGet', summary: 'Get an active commerce product with active SKUs in the patient clinic' }) @ApiOkResponse({ type: PatientCommerceProductDto }) @ApiErrorResponse(404, 'Product is not active or was not found.') detail(@Req() request: AuthenticatedRequest, @Param('productId', new ParseUUIDPipe({ version: '4' })) id: string) { return this.catalog.detail(request.auth.userId, id); }
}
