import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, Length, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export class OfferingPolicyDraftDto {
  @ApiPropertyOptional({ type: 'integer', minimum: 0, maximum: 120 }) @IsOptional() @IsInt() @Min(0) @Max(120) minimumAgeYears?: number;
  @ApiPropertyOptional({ type: 'integer', minimum: 60, maximum: 86400 }) @IsOptional() @IsInt() @Min(60) @Max(86400) quoteTtlSeconds?: number;
  @ApiPropertyOptional({ type: 'integer', minimum: 1, maximum: 3650 }) @IsOptional() @IsInt() @Min(1) @Max(3650) entitlementValidityDays?: number;
  @ApiPropertyOptional({ type: 'integer', minimum: 1, maximum: 720 }) @IsOptional() @IsInt() @Min(1) @Max(720) invitationTtlHours?: number;
  @ApiPropertyOptional({ maxLength: 80 }) @IsOptional() @IsString() @Length(1, 80) @Matches(/\S/u) refundPolicyRef?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4') consentPolicyVersionId?: string;
  @ApiPropertyOptional({ maxLength: 80 }) @IsOptional() @IsString() @Length(1, 80) @Matches(/\S/u) retentionPolicyRef?: string;
  @ApiPropertyOptional({ maxLength: 80 }) @IsOptional() @IsString() @Length(1, 80) @Matches(/\S/u) resultVisibilityPolicyRef?: string;
}
export class CreateAssessmentOfferingVersionDto {
  @ApiProperty({ maxLength: 80, pattern: '^[A-Z][A-Z0-9_]{0,79}$' }) @IsString() @Matches(/^[A-Z][A-Z0-9_]{0,79}$/u) offeringKey!: string;
  @ApiProperty({ enum: ['INDIVIDUAL', 'COUPLES'] }) @IsIn(['INDIVIDUAL', 'COUPLES']) kind!: 'INDIVIDUAL' | 'COUPLES';
  @ApiProperty({ maxLength: 255 }) @IsString() @Length(1, 255) @Matches(/\S/u) title!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') assessmentVersionId!: string;
  @ApiProperty({ enum: ['FREE', 'PAID'] }) @IsIn(['FREE', 'PAID']) priceMode!: 'FREE' | 'PAID';
  @ApiProperty({ enum: ['IRR'] }) @IsIn(['IRR']) currency!: 'IRR';
  @ApiPropertyOptional({ enum: ['PRE_START', 'PRE_RESULT_UNLOCK'], nullable: true }) @IsOptional() @IsIn(['PRE_START', 'PRE_RESULT_UNLOCK']) paymentPoint?: 'PRE_START' | 'PRE_RESULT_UNLOCK' | null;
  @ApiPropertyOptional({ type: String, nullable: true, pattern: '^(0|[1-9][0-9]{0,18})$' }) @IsOptional() @IsString() @Matches(/^(0|[1-9][0-9]{0,18})$/u) amountRial?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 80 }) @IsOptional() @IsString() @Matches(/^[A-Za-z][A-Za-z0-9_.:-]{0,79}$/u) algorithmId?: string | null;
  @ApiPropertyOptional({ type: 'integer', minimum: 1, maximum: 2147483647, nullable: true }) @IsOptional() @IsInt() @Min(1) @Max(2147483647) algorithmVersion?: number | null;
  @ApiPropertyOptional({ type: OfferingPolicyDraftDto }) @IsOptional() @IsObject() @ValidateNested() @Type(() => OfferingPolicyDraftDto) policyDraft?: OfferingPolicyDraftDto;
}
export class AssessmentOfferingListQueryDto {
  @ApiPropertyOptional({ type: 'integer', minimum: 1, maximum: 10000, default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) page = 1;
  @ApiPropertyOptional({ type: 'integer', minimum: 1, maximum: 50, default: 20 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) pageSize = 20;
  @ApiPropertyOptional({ maxLength: 80 }) @IsOptional() @IsString() @MaxLength(80) @Matches(/^[A-Z][A-Z0-9_]{0,79}$/u) offeringKey?: string;
  @ApiPropertyOptional({ enum: ['INDIVIDUAL', 'COUPLES'] }) @IsOptional() @IsIn(['INDIVIDUAL', 'COUPLES']) kind?: 'INDIVIDUAL' | 'COUPLES';
}
export class AssessmentOfferingReadinessDto {
  @ApiProperty() ready!: boolean;
  @ApiProperty({ type: [String] }) blockers!: string[];
}
export class AssessmentOfferingVersionResponseDto {
  @ApiPropertyOptional({ type: String, format: "uuid", nullable: true }) adminPublicationId?: string | null;
  @ApiPropertyOptional({ enum: ["ADMIN_PUBLISHED"], nullable: true }) publicationAuthority?: "ADMIN_PUBLISHED" | null;
  @ApiPropertyOptional({ type: () => AssessmentOfferingTextsDto, nullable: true }) authoringTexts?: AssessmentOfferingTextsDto | null;
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() offeringKey!: string;
  @ApiProperty() versionNumber!: number;
  @ApiProperty({ enum: ['INDIVIDUAL', 'COUPLES'] }) kind!: string;
  @ApiProperty() title!: string;
  @ApiProperty() locale!: string;
  @ApiProperty({ enum: ['DRAFT', 'RETIRED'] }) status!: string;
  @ApiProperty({ format: 'uuid' }) assessmentVersionId!: string;
  @ApiProperty({ enum: ['FREE', 'PAID'] }) priceMode!: string;
  @ApiProperty({ type: String, nullable: true, enum: ['PRE_START', 'PRE_RESULT_UNLOCK'] }) paymentPoint!: string | null;
  @ApiProperty({ type: String, nullable: true }) amountRial!: string | null;
  @ApiProperty({ enum: ['IRR'] }) currency!: string;
  @ApiProperty({ type: String, nullable: true }) algorithmId!: string | null;
  @ApiProperty({ type: Number, nullable: true }) algorithmVersion!: number | null;
  @ApiProperty({ type: OfferingPolicyDraftDto }) policyDraft!: OfferingPolicyDraftDto;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) retiredAt!: Date | null;
  @ApiProperty({ type: AssessmentOfferingReadinessDto }) releaseReadiness!: AssessmentOfferingReadinessDto;
}
export class AssessmentOfferingPageResponseDto {
  @ApiProperty({ type: [AssessmentOfferingVersionResponseDto] }) items!: AssessmentOfferingVersionResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}

export class AssessmentCouplePairTextDto {
  @ApiProperty({ maxLength: 100 }) @IsString() @Length(1, 100) @Matches(/^\S+$/u) firstProfileId!: string;
  @ApiProperty({ maxLength: 100 }) @IsString() @Length(1, 100) @Matches(/^\S+$/u) secondProfileId!: string;
  @ApiProperty({ maxLength: 20000 }) @IsString() @Length(1, 20000) @Matches(/\S/u) text!: string;
}
export class MarriageRoleDto {
  @ApiProperty({ enum: ['FIRST','SECOND'] }) @IsIn(['FIRST','SECOND']) id!: 'FIRST' | 'SECOND';
  @ApiProperty({ maxLength: 100 }) @IsString() @Length(1,100) @Matches(/\S/u) title!: string;
  @ApiProperty({ type: [String], enum: ['MALE','FEMALE'], minItems: 1, maxItems: 2 }) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(2) @ArrayUnique() @IsIn(['MALE','FEMALE'], { each: true }) genders!: ('MALE'|'FEMALE')[];
  @ApiProperty({ minimum: 18, maximum: 120 }) @IsInt() @Min(18) @Max(120) minimumAgeYears!: number;
}
export class MarriageDefinitionDto {
  @ApiProperty({ enum: [1] }) @IsIn([1]) version!: 1;
  @ApiProperty({ enum: ['MARRIAGE'] }) @IsIn(['MARRIAGE']) purpose!: 'MARRIAGE';
  @ApiProperty({ type: [MarriageRoleDto], minItems: 2, maxItems: 2 }) @IsArray() @ArrayMinSize(2) @ArrayMaxSize(2) @ValidateNested({ each: true }) @Type(() => MarriageRoleDto) roles!: MarriageRoleDto[];
  @ApiProperty({ maxLength: 20000 }) @IsString() @Length(1,20000) @Matches(/\S/u) genericJointText!: string;
}
export class AssessmentOfferingTextsDto {
  @ApiPropertyOptional({ type: MarriageDefinitionDto }) @IsOptional() @IsObject() @ValidateNested() @Type(() => MarriageDefinitionDto) marriage?: MarriageDefinitionDto;
  @ApiPropertyOptional({ type: [AssessmentCouplePairTextDto], maxItems: 256 }) @IsOptional() @IsArray() @ArrayMaxSize(256) @ValidateNested({ each: true }) @Type(() => AssessmentCouplePairTextDto) pairTexts?: AssessmentCouplePairTextDto[];
  @ApiProperty({ maxLength: 20000 }) @IsString() @Length(1, 20000) @Matches(/\S/u) processing!: string;
  @ApiProperty({ maxLength: 20000 }) @IsString() @Length(1, 20000) @Matches(/\S/u) retention!: string;
  @ApiProperty({ maxLength: 20000 }) @IsString() @Length(1, 20000) @Matches(/\S/u) visibility!: string;
  @ApiPropertyOptional({ maxLength: 20000 }) @IsOptional() @IsString() @MaxLength(20000) terms?: string;
  @ApiPropertyOptional({ maxLength: 20000 }) @IsOptional() @IsString() @MaxLength(20000) disclosure?: string;
}
export class CreateInlineAssessmentOfferingDto {
  @ApiPropertyOptional({ pattern: "^[a-f0-9]{64}$" }) @IsOptional() @IsString() @Matches(/^[a-f0-9]{64}$/u) expectedQuestionnaireHash?: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') assessmentVersionId!: string;
  @ApiProperty({ maxLength: 255 }) @IsString() @Length(1, 255) @Matches(/\S/u) title!: string;
  @ApiProperty({ enum: ['INDIVIDUAL', 'COUPLES'] }) @IsIn(['INDIVIDUAL', 'COUPLES']) kind!: 'INDIVIDUAL' | 'COUPLES';
  @ApiProperty({ enum: ['FREE', 'PAID'] }) @IsIn(['FREE', 'PAID']) priceMode!: 'FREE' | 'PAID';
  @ApiPropertyOptional({ type: String }) @IsOptional() @IsString() @Matches(/^[1-9][0-9]{0,18}$/u) amountRial?: string;
  @ApiProperty({ type: AssessmentOfferingTextsDto }) @IsObject() @ValidateNested() @Type(() => AssessmentOfferingTextsDto) texts!: AssessmentOfferingTextsDto;
}
