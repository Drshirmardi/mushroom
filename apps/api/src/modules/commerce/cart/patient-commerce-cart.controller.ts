import { Body, Controller, Get, Put, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../common/auth/authorization.policy';
import { PatientCommerceCartService } from './patient-commerce-cart.service';
import { PatientCartDto, PatientWishlistDto, UpdatePatientCartDto, UpdatePatientWishlistDto } from './patient-commerce-cart.dto';

@ApiTags('Patient Commerce') @ApiBearerAuth('bearerAuth') @RequireRoles('PATIENT') @Controller('patients/me')
export class PatientCommerceCartController {
  constructor(private readonly commerce: PatientCommerceCartService) {}
  @Get('cart') @RequirePermissions(PERMISSIONS.COMMERCE_READ_SELF) @ApiOperation({ operationId: 'patientCommerceCartGet', summary: 'Get the signed-in patient cart' }) @ApiOkResponse({ type: PatientCartDto }) cart(@Req() request: AuthenticatedRequest) { return this.commerce.cart(request.auth.userId); }
  @Put('cart') @RequirePermissions(PERMISSIONS.COMMERCE_WRITE_SELF) @ApiOperation({ operationId: 'patientCommerceCartUpdate', summary: 'Set a cart SKU quantity without reserving stock' }) @ApiOkResponse({ type: PatientCartDto }) updateCart(@Req() request: AuthenticatedRequest, @Body() body: UpdatePatientCartDto) { return this.commerce.updateCart(request.auth.userId, body); }
  @Get('wishlist') @RequirePermissions(PERMISSIONS.COMMERCE_READ_SELF) @ApiOperation({ operationId: 'patientCommerceWishlistGet', summary: 'Get the signed-in patient wishlist' }) @ApiOkResponse({ type: PatientWishlistDto }) wishlist(@Req() request: AuthenticatedRequest) { return this.commerce.wishlist(request.auth.userId); }
  @Put('wishlist') @RequirePermissions(PERMISSIONS.COMMERCE_WRITE_SELF) @ApiOperation({ operationId: 'patientCommerceWishlistUpdate', summary: 'Save or remove an active SKU for the signed-in patient' }) @ApiOkResponse({ type: PatientWishlistDto }) updateWishlist(@Req() request: AuthenticatedRequest, @Body() body: UpdatePatientWishlistDto) { return this.commerce.updateWishlist(request.auth.userId, body); }
}
