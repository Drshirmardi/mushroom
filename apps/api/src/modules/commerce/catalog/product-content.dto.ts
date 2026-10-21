import { Type } from 'class-transformer';
import { IsDefined, IsIn, IsInt, IsObject, IsOptional, IsString, Max, Min, ValidateIf, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const CONTENT_SOURCE_KINDS = ['MANUFACTURER_DOCUMENT', 'PACKAGING', 'SUPPLIER_DOCUMENT', 'OTHER_DOCUMENT'] as const;
export class ProductContentFieldsDto {
  // Canonical length checks occur in the shared domain policy after NFKC/trim.
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 240 }) @IsOptional() @IsString() brand?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 240 }) @IsOptional() @IsString() manufacturer?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 500 }) @IsOptional() @IsString() shortDescription?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 5000 }) @IsOptional() @IsString() description?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 5000 }) @IsOptional() @IsString() ingredients?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 5000 }) @IsOptional() @IsString() usageInstructions?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 5000 }) @IsOptional() @IsString() warnings?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 5000 }) @IsOptional() @IsString() contraindications?: string | null;
}
export class ProductContentProvenanceDto {
  @ApiProperty({ enum: CONTENT_SOURCE_KINDS }) @IsIn(CONTENT_SOURCE_KINDS) sourceKind!: (typeof CONTENT_SOURCE_KINDS)[number];
  @ApiProperty({ maxLength: 1000 }) @IsString() sourceReference!: string;
}
export class CreateProductContentDto {
  @ApiPropertyOptional({ type: ProductContentFieldsDto }) @ValidateIf((_object, value) => value !== undefined) @IsDefined() @IsObject() @ValidateNested() @Type(() => ProductContentFieldsDto) fields?: ProductContentFieldsDto;
  @ApiPropertyOptional({ type: ProductContentProvenanceDto, nullable: true }) @IsOptional() @IsObject() @ValidateNested() @Type(() => ProductContentProvenanceDto) provenance?: ProductContentProvenanceDto | null;
}
export class UpdateProductContentDto extends CreateProductContentDto {
  @ApiProperty({ minimum: 0, maximum: 2147483647 }) @IsInt() @Min(0) @Max(2147483647) expectedContentRevision!: number;
}
export class ApproveProductContentDto {
  @ApiProperty({ minimum: 0, maximum: 2147483647 }) @IsInt() @Min(0) @Max(2147483647) expectedContentRevision!: number;
}
export class ProductContentFieldsResponseDto {
  @ApiProperty({ type: String, nullable: true }) brand!: string | null;
  @ApiProperty({ type: String, nullable: true }) manufacturer!: string | null;
  @ApiProperty({ type: String, nullable: true }) shortDescription!: string | null;
  @ApiProperty({ type: String, nullable: true }) description!: string | null;
  @ApiProperty({ type: String, nullable: true }) ingredients!: string | null;
  @ApiProperty({ type: String, nullable: true }) usageInstructions!: string | null;
  @ApiProperty({ type: String, nullable: true }) warnings!: string | null;
  @ApiProperty({ type: String, nullable: true }) contraindications!: string | null;
}
export class PublicProductContentDto extends ProductContentFieldsResponseDto {
  @ApiProperty({ minimum: 0 }) contentRevision!: number;
}
export class AdminProductContentDto extends ProductContentFieldsResponseDto {
  @ApiProperty({ minimum: 0 }) contentRevision!: number;
  @ApiProperty({ enum: ['LEGACY_UNREVIEWED', 'PENDING_APPROVAL', 'APPROVED'] }) status!: string;
  @ApiProperty({ type: ProductContentProvenanceDto, nullable: true }) provenance!: ProductContentProvenanceDto | null;
  @ApiProperty({ type: Number, nullable: true }) approvedContentRevision!: number | null;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) contentApprovedAt!: string | null;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) contentApprovedByUserId!: string | null;
}
