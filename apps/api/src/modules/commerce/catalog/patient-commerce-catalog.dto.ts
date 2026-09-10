import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PatientCommerceListQueryDto {
  @ApiPropertyOptional({ type: Number, minimum: 1, default: 1 }) @Type(() => Number) @IsOptional() @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 100, default: 24 }) @Type(() => Number) @IsOptional() @IsInt() @Min(1) @Max(100) pageSize = 24;
  @ApiPropertyOptional({ maxLength: 120 }) @IsOptional() @IsString() @MaxLength(120) query?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4') categoryId?: string;
}

export class PatientCommerceCategoryDto { @ApiProperty() id!: string; @ApiProperty() name!: string; @ApiProperty() slug!: string; }
export class PatientCommerceSkuDto { @ApiProperty() id!: string; @ApiProperty() code!: string; @ApiPropertyOptional({ type: String, nullable: true }) title!: string | null; @ApiProperty({ type: String, description: 'Integer TOMAN.' }) currentPriceToman!: string; @ApiProperty({ type: String, description: 'Integer TOMAN.' }) currentTaxToman!: string; }
export class PatientCommerceProductDto { @ApiProperty() id!: string; @ApiProperty() title!: string; @ApiProperty() slug!: string; @ApiPropertyOptional({ type: String, nullable: true }) description!: string | null; @ApiProperty({ type: PatientCommerceCategoryDto }) category!: PatientCommerceCategoryDto; @ApiProperty({ type: PatientCommerceSkuDto, isArray: true }) skus!: PatientCommerceSkuDto[]; }
export class PatientCommerceProductPageDto { @ApiProperty({ type: PatientCommerceProductDto, isArray: true }) items!: PatientCommerceProductDto[]; @ApiProperty() page!: number; @ApiProperty() pageSize!: number; @ApiProperty() total!: number; }
