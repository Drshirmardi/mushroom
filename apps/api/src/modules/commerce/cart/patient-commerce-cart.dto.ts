import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsUUID, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PatientCommerceProductDto, PatientCommerceSkuDto } from '../catalog/patient-commerce-catalog.dto';

export class UpdatePatientCartDto { @ApiProperty({ format: 'uuid' }) @IsUUID('4') skuId!: string; @ApiProperty({ minimum: 0, maximum: 100 }) @Type(() => Number) @IsInt() @Min(0) @Max(100) quantity!: number; }
export class UpdatePatientWishlistDto { @ApiProperty({ format: 'uuid' }) @IsUUID('4') skuId!: string; @ApiProperty() @IsBoolean() saved!: boolean; }
export class PatientCartItemDto { @ApiProperty() id!: string; @ApiProperty() quantity!: number; @ApiProperty({ type: PatientCommerceSkuDto }) sku!: PatientCommerceSkuDto; @ApiProperty({ type: PatientCommerceProductDto }) product!: PatientCommerceProductDto; }
export class PatientCartDto { @ApiProperty({ type: PatientCartItemDto, isArray: true }) items!: PatientCartItemDto[]; }
export class PatientWishlistItemDto { @ApiProperty() id!: string; @ApiProperty({ type: PatientCommerceSkuDto }) sku!: PatientCommerceSkuDto; @ApiProperty({ type: PatientCommerceProductDto }) product!: PatientCommerceProductDto; }
export class PatientWishlistDto { @ApiProperty({ type: PatientWishlistItemDto, isArray: true }) items!: PatientWishlistItemDto[]; }
