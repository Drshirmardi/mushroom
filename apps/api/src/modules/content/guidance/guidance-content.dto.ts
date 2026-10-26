import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, Equals, IsArray, IsIn, IsInt, IsObject, IsOptional, IsString, IsUrl, IsUUID, Length, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export const GUIDANCE_KINDS = ['GENERAL_EDUCATION', 'DIETARY_EDUCATION', 'TEMPERAMENT_INTERPRETATION', 'PERSONALITY_DESCRIPTION'] as const;
export class GuidanceSourceDto {
  @ApiProperty() @IsString() @Length(1, 240) @Matches(/\S/u) label!: string;
  @ApiProperty({ format: 'uri' }) @IsUrl({ protocols: ['https'], require_protocol: true, require_valid_protocol: true }) @MaxLength(2048) url!: string;
  @ApiProperty({ example: '2026-10-16' }) @Matches(/^\d{4}-\d{2}-\d{2}$/u) accessedOn!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 120) @Matches(/\S/u) sourceVersion?: string;
}
export class GuidanceSafetyDto {
  @ApiProperty() @IsString() @Length(1, 1000) @Matches(/\S/u) intendedAudience!: string;
  @ApiProperty() @IsString() @Length(1, 4000) @Matches(/\S/u) limitations!: string;
  @ApiProperty({ type: [String] }) @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @Length(1, 1000, { each: true }) @Matches(/\S/u, { each: true }) contraindications!: string[];
  @ApiProperty() @IsString() @Length(1, 2000) @Matches(/\S/u) seekProfessionalCare!: string;
}
export class GuidanceContentCreateDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') articleId!: string;
  @ApiProperty({ example: 'fa-IR' }) @Matches(/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,3}$/u) locale!: string;
  @ApiProperty({ enum: GUIDANCE_KINDS }) @IsIn(GUIDANCE_KINDS) kind!: typeof GUIDANCE_KINDS[number];
  @ApiProperty({ type: [GuidanceSourceDto] }) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => GuidanceSourceDto) provenance!: GuidanceSourceDto[];
  @ApiProperty({ type: GuidanceSafetyDto }) @IsObject() @ValidateNested() @Type(() => GuidanceSafetyDto) safety!: GuidanceSafetyDto;
}
export class GuidanceApprovalDto {
  @ApiProperty({ pattern: '^[a-f0-9]{64}$' }) @Matches(/^[a-f0-9]{64}$/u) contentHash!: string;
  @ApiProperty({ enum: [true] }) @Equals(true) educationalOnly!: true;
  @ApiProperty({ enum: [true] }) @Equals(true) noDiagnosisOrTherapeuticDiet!: true;
}
export class GuidanceContentQueryDto {
  @ApiPropertyOptional({ type: 'integer', minimum: 1, maximum: 10000, default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) page = 1;
  @ApiPropertyOptional({ type: 'integer', minimum: 1, maximum: 50, default: 20 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) pageSize = 20;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4') articleId?: string;
  @ApiPropertyOptional({ enum: ['DRAFT', 'APPROVED', 'REVOKED'] }) @IsOptional() @IsIn(['DRAFT', 'APPROVED', 'REVOKED']) status?: string;
}
export class GuidanceContentResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) articleId!: string;
  @ApiProperty() versionNumber!: number;
  @ApiProperty() locale!: string;
  @ApiProperty({ enum: GUIDANCE_KINDS }) kind!: string;
  @ApiProperty({ enum: ['DRAFT', 'APPROVED', 'REVOKED'] }) status!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ type: String, nullable: true }) summary!: string | null;
  @ApiProperty({ description: 'Plain content; never execute untrusted HTML.' }) body!: string;
  @ApiProperty() contentHash!: string;
  @ApiProperty({ type: [GuidanceSourceDto] }) provenance!: GuidanceSourceDto[];
  @ApiProperty({ type: GuidanceSafetyDto }) safety!: GuidanceSafetyDto;
  @ApiProperty({ enum: [true] }) educationalOnly!: true;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) approvedAt!: Date | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) revokedAt!: Date | null;
}
export class GuidanceContentPageDto {
  @ApiProperty({ type: [GuidanceContentResponseDto] }) items!: GuidanceContentResponseDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
}
