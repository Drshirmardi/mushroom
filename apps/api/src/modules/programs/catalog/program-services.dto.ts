import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, Length, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { SOURCE_FIELDS } from './catalog-merge';

export const AUDIENCES = ['SHARED', 'FEMALE', 'MALE', 'REVIEW_REQUIRED'] as const;
export class WorkingSafetyDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) intendedAudience?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) limitations?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(1000, { each: true }) contraindications?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) seekProfessionalCare?: string;
}
export class ProgramWorkingDraftDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(240) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) summary?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100000) body?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) category?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) eligibilityDescription?: string;
  @ApiPropertyOptional({ enum: AUDIENCES }) @IsOptional() @IsIn(AUDIENCES) audience?: typeof AUDIENCES[number];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(16) @ArrayUnique() @Matches(/^(damavi|safravi|balgami|sodavi)\/(damavi|safravi|balgami|sodavi)$/, { each: true }) pairs?: string[];
  @ApiPropertyOptional({ type: WorkingSafetyDto }) @IsOptional() @IsObject() @ValidateNested() @Type(() => WorkingSafetyDto) safety?: WorkingSafetyDto;
}
export class ProgramServiceCreateDto {
  @ApiProperty() @Matches(/^[A-Z][A-Z0-9_]{2,99}$/) programKey!: string;
  @ApiProperty() @Matches(/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,3}$/) locale!: string;
  @ApiProperty({ type: ProgramWorkingDraftDto }) @IsObject() @ValidateNested() @Type(() => ProgramWorkingDraftDto) draft!: ProgramWorkingDraftDto;
}
export class ProgramRevisionDto {
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) @Max(2147483646) expectedRevision!: number;
}
export class ProgramDraftSaveDto extends ProgramRevisionDto {
  @ApiPropertyOptional({ type: String, nullable: true }) @IsOptional() @IsUUID('4') categoryId?: string | null;
  @ApiProperty({ type: ProgramWorkingDraftDto }) @IsObject() @ValidateNested() @Type(() => ProgramWorkingDraftDto) draft!: ProgramWorkingDraftDto;
}
export class ProgramServiceQueryDto {
  @ApiPropertyOptional({ type: Number, default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) page = 1;
  @ApiPropertyOptional({ type: Number, default: 20 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) pageSize = 20;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(240) search?: string;
  @ApiPropertyOptional({ enum: ['ACTIVE', 'ARCHIVED', 'ALL'] }) @IsOptional() @IsIn(['ACTIVE', 'ARCHIVED', 'ALL']) state: 'ACTIVE' | 'ARCHIVED' | 'ALL' = 'ACTIVE';
  @ApiPropertyOptional({ enum: AUDIENCES }) @IsOptional() @IsIn(AUDIENCES) audience?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID('4') categoryId?: string;
}
export class ProgramServiceResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() programKey!: string;
  @ApiProperty() locale!: string;
  @ApiProperty() revision!: number;
  @ApiProperty({ type: ProgramWorkingDraftDto }) draft!: ProgramWorkingDraftDto;
  @ApiProperty({ enum: AUDIENCES }) audience!: string;
  @ApiProperty({ type: String, nullable: true }) categoryId!: string | null;
  @ApiProperty({ type: String, nullable: true }) publishedDefinitionId!: string | null;
  @ApiProperty({ type: String, nullable: true }) baseAmountRial!: string | null;
  @ApiProperty() discountPercent!: number;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) discountStartsAt!: Date | null;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) discountEndsAt!: Date | null;
  @ApiProperty() sellingEnabled!: boolean;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) archivedAt!: Date | null;
}
export class ProgramServicePageDto {
  @ApiProperty({ type: [ProgramServiceResponseDto] }) items!: ProgramServiceResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
export class ProgramCategoryCreateDto {
  @ApiProperty() @Matches(/^[A-Za-z0-9_-]{2,100}$/) key!: string;
  @ApiProperty() @IsString() @Length(1, 100) @Matches(/\S/) name!: string;
}
export class ProgramCategorySaveDto extends ProgramRevisionDto {
  @ApiProperty() @IsString() @Length(1, 100) @Matches(/\S/) name!: string;
  @ApiProperty() @IsBoolean() active!: boolean;
  @ApiPropertyOptional() @IsOptional() @IsUUID('4') reassignToId?: string;
}
export class ProgramCategoryResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() key!: string;
  @ApiProperty() name!: string;
  @ApiProperty() revision!: number;
  @ApiProperty() active!: boolean;
}
export class ProgramCategoryListDto {
  @ApiProperty({ type: [ProgramCategoryResponseDto] }) items!: ProgramCategoryResponseDto[];
}
export class CatalogPreviewRequestDto {
  @ApiProperty({ type: [String], maxItems: 50 }) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @ArrayUnique() @Matches(/^[A-Z][A-Z0-9_]{2,99}:[a-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,3}$/, { each: true }) entries!: string[];
  @ApiPropertyOptional({ enum: SOURCE_FIELDS, isArray: true }) @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(8) @ArrayUnique() @IsIn(SOURCE_FIELDS, { each: true }) fields?: typeof SOURCE_FIELDS[number][];
}
export class CatalogResolutionDto {
  @ApiProperty({ enum: SOURCE_FIELDS }) @IsIn(SOURCE_FIELDS) field!: typeof SOURCE_FIELDS[number];
  @ApiProperty({ enum: ['SOURCE', 'DASHBOARD'] }) @IsIn(['SOURCE', 'DASHBOARD']) choice!: 'SOURCE' | 'DASHBOARD';
}
export class CatalogApplyItemDto {
  @ApiProperty() @Matches(/^[A-Z][A-Z0-9_]{2,99}:[a-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,3}$/) key!: string;
  @ApiPropertyOptional({ type: [CatalogResolutionDto] }) @IsOptional() @IsArray() @ArrayMaxSize(8) @ValidateNested({ each: true }) @Type(() => CatalogResolutionDto) resolutions?: CatalogResolutionDto[];
}
export class CatalogApplyRequestDto {
  @ApiProperty({ type: [CatalogApplyItemDto], maxItems: 10 }) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(10) @ValidateNested({ each: true }) @Type(() => CatalogApplyItemDto) items!: CatalogApplyItemDto[];
}
export class CatalogEntrySummaryDto {
  @ApiPropertyOptional() invalidReason?: string;
  @ApiProperty() key!: string;
  @ApiProperty() title!: string;
  @ApiProperty() category!: string;
  @ApiProperty({ enum: AUDIENCES }) audience!: string;
  @ApiProperty() baseAmountRial!: string;
  @ApiProperty() reviewRequired!: boolean;
  @ApiProperty() sourceCount!: number;
}
export class CatalogListDto {
  @ApiProperty() bundleHash!: string;
  @ApiProperty({ type: [CatalogEntrySummaryDto] }) items!: CatalogEntrySummaryDto[];
}
export class CatalogPreviewItemDto {
  @ApiPropertyOptional() invalidReason?: string;
  @ApiProperty() key!: string;
  @ApiProperty({ type: String, nullable: true }) serviceId!: string | null;
  @ApiProperty({ type: Number, nullable: true }) expectedRevision!: number | null;
  @ApiProperty({ enum: ['NEW', 'UNCHANGED', 'CHANGED', 'CONFLICT', 'ARCHIVED', 'INVALID'] }) state!: string;
  @ApiProperty({ type: [String], enum: SOURCE_FIELDS }) conflicts!: string[];
  @ApiProperty({ type: ProgramWorkingDraftDto, nullable: true }) current!: ProgramWorkingDraftDto | null;
  @ApiProperty({ type: ProgramWorkingDraftDto, nullable: true }) incoming!: ProgramWorkingDraftDto | null;
}
export class CatalogPreviewResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() bundleHash!: string;
  @ApiProperty({ format: 'date-time' }) expiresAt!: Date;
  @ApiProperty({ type: [CatalogPreviewItemDto] }) items!: CatalogPreviewItemDto[];
}
export class CatalogApplyResultDto {
  @ApiProperty() key!: string;
  @ApiProperty({ enum: ['APPLIED', 'UNCHANGED', 'SKIPPED', 'CONFLICT', 'INVALID'] }) state!: string;
  @ApiProperty({ type: String, nullable: true }) serviceId!: string | null;
  @ApiPropertyOptional() code?: string;
}
export class CatalogApplyResponseDto {
  @ApiProperty({ type: [CatalogApplyResultDto] }) items!: CatalogApplyResultDto[];
}
