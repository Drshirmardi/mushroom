import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrorResponse } from '../../../common/errors/api-error-response.decorator';
import { Public } from '../../../common/auth/public.decorator';
import { PatientCommerceCatalogService } from './patient-commerce-catalog.service';
import { PatientCommerceListQueryDto, PatientCommerceProductDto, PatientCommerceProductPageDto } from './patient-commerce-catalog.dto';

@ApiTags('Commerce Catalog') @Public() @Controller('commerce/products')
export class PatientCommerceCatalogController {
  constructor(private readonly catalog: PatientCommerceCatalogService) {}
  @Get() @ApiOperation({ operationId: 'patientCommerceProductsList', summary: 'List active commerce products with active SKUs in the active clinic' }) @ApiOkResponse({ type: PatientCommerceProductPageDto }) list(@Query() query: PatientCommerceListQueryDto) { return this.catalog.list(query); }
  @Get(':productId') @ApiOperation({ operationId: 'patientCommerceProductGet', summary: 'Get an active commerce product with active SKUs in the active clinic' }) @ApiOkResponse({ type: PatientCommerceProductDto }) @ApiErrorResponse(404, 'Product is not active or was not found.') detail(@Param('productId', new ParseUUIDPipe({ version: '4' })) id: string) { return this.catalog.detail(id); }
}
