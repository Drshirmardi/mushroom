import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import type { AuthenticatedRequest } from '../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../common/auth/authorization.policy';
import { VisitCareService } from './visit-care.service';

export class VisitProductQuery {
  @ApiPropertyOptional({ maxLength: 100 }) @IsOptional() @IsString() @MaxLength(100) query?: string;
  @ApiPropertyOptional({ type: Number, default: 1, minimum: 1, maximum: 10000 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) page: number = 1;
}
export class VisitCartAddDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') commandId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') skuId!: string;
  @ApiProperty({ minimum: 1, maximum: 100 }) @Type(() => Number) @IsInt() @Min(1) @Max(100) quantity!: number;
}
export class VisitProductDto {
  @ApiProperty() skuId!: string;
  @ApiProperty() code!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ type: String, nullable: true }) variant!: string | null;
  @ApiProperty() priceToman!: string;
}
export class VisitProductsDto {
  @ApiProperty({ type: () => VisitProductDto, isArray: true }) items!: VisitProductDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
}
export class VisitCartResultDto {
  @ApiProperty() skuId!: string;
  @ApiProperty() addedQuantity!: number;
  @ApiProperty() quantity!: number;
}
@ApiTags('Visit care') @ApiBearerAuth('bearerAuth') @RequireRoles('ADMIN', 'DOCTOR')
@RequirePermissions(PERMISSIONS.CLINICAL_RECORD_EDIT)
@ApiParam({ name: 'appointmentId', format: 'uuid' })
@Controller('admin/appointments/:appointmentId/care')
export class VisitCareController {
  constructor(private readonly care: VisitCareService) {}
  @Get('products') @ApiOperation({ operationId: 'visitCareProductsList' }) @ApiOkResponse({ type: VisitProductsDto })
  products(@Param('appointmentId', new ParseUUIDPipe({ version: '4' })) id: string, @Query() query: VisitProductQuery, @Req() req: AuthenticatedRequest) { return this.care.products(id, this.actor(req), query.query?.trim() ?? '', query.page); }
  @Post('cart-items') @HttpCode(200) @ApiOperation({ operationId: 'visitCareCartAdd' }) @ApiOkResponse({ type: VisitCartResultDto })
  add(@Param('appointmentId', new ParseUUIDPipe({ version: '4' })) id: string, @Body() body: VisitCartAddDto, @Req() req: AuthenticatedRequest) { return this.care.addToCart(id, this.actor(req), body); }
  private actor(req: AuthenticatedRequest) { return { actorUserId: req.auth.userId, actorSessionId: req.auth.sessionId, requestId: req.id, ipAddress: req.ip, roles: req.auth.roles }; }
}
