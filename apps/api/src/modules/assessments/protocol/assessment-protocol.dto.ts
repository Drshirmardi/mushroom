import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Equals, IsInt, IsOptional, IsString, IsUUID, Length, Matches, Max, Min } from 'class-validator';

export class ProtocolPageQueryDto {
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) page = 1;
  @ApiPropertyOptional({ default: 20 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) pageSize = 20;
}
export class ProtocolQueueQueryDto extends ProtocolPageQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 100) @Matches(/\S/u) assessmentKey?: string;
}
export class ProtocolPreviewQueryDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4') consentPolicyVersionId?: string;
}
export class ProtocolApproveDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') consentPolicyVersionId!: string;
  @ApiProperty({ pattern: '^[a-f0-9]{64}$' }) @Matches(/^[a-f0-9]{64}$/u) protocolHash!: string;
  @ApiProperty({ minimum: 0, maximum: 2147483646 }) @IsInt() @Min(0) @Max(2147483646) expectedReviewNumber!: number;
  @ApiProperty({ enum: [true] }) @Equals(true) reviewedQuestionnaireAndScoring!: true;
  @ApiProperty({ enum: [true] }) @Equals(true) educationalOnly!: true;
  @ApiProperty({ enum: [true] }) @Equals(true) noDiagnosisOrTherapeuticDiet!: true;
}
export class ProtocolWithdrawalDto {
  @ApiProperty({ pattern: '^[a-f0-9]{64}$' }) @Matches(/^[a-f0-9]{64}$/u) protocolHash!: string;
  @ApiProperty({ minimum: 1, maximum: 2147483646 }) @IsInt() @Min(1) @Max(2147483646) expectedReviewNumber!: number;
  @ApiProperty({ maxLength: 500 }) @IsString() @Length(1, 500) @Matches(/\S/u) withdrawalReason!: string;
}
export class ProtocolReviewResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) assessmentVersionId!: string;
  @ApiProperty() reviewNumber!: number;
  @ApiProperty({ enum: ['APPROVED', 'WITHDRAWN'] }) decision!: string;
  @ApiProperty() questionnaireContentHash!: string;
  @ApiProperty() algorithmId!: string;
  @ApiProperty() algorithmVersion!: number;
  @ApiProperty({ format: 'uuid' }) consentPolicyVersionId!: string;
  @ApiProperty() consentContentHash!: string;
  @ApiProperty() protocolHash!: string;
  @ApiProperty({ type: String, nullable: true }) withdrawalOfId!: string | null;
  @ApiProperty({ type: String, nullable: true }) withdrawalReason!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
}
export class ProtocolReviewPageDto {
  @ApiProperty({ type: [ProtocolReviewResponseDto] }) items!: ProtocolReviewResponseDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
}
export class ProtocolQuestionnaireDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() assessmentKey!: string;
  @ApiProperty() versionNumber!: number;
  @ApiProperty() title!: string;
  @ApiProperty() locale!: string;
  @ApiProperty() contentHash!: string;
  @ApiProperty({ enum: ['PUBLISHED', 'RETIRED'] }) status!: string;
  @ApiProperty({ type: 'object', additionalProperties: true }) structure!: Record<string, unknown>;
}
export class ProtocolConsentDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() versionNumber!: number;
  @ApiProperty({ enum: ['ASSESSMENT_PROCESSING'] }) policyKey!: string;
  @ApiProperty() locale!: string;
  @ApiProperty() title!: string;
  @ApiProperty() body!: string;
  @ApiProperty() contentHash!: string;
  @ApiProperty() status!: string;
}
export class ProtocolPreviewResponseDto {
  @ApiProperty({ type: ProtocolQuestionnaireDto }) questionnaire!: ProtocolQuestionnaireDto;
  @ApiProperty({ type: ProtocolConsentDto, nullable: true }) consentPolicy!: ProtocolConsentDto | null;
  @ApiProperty() algorithmId!: string;
  @ApiProperty() algorithmVersion!: number;
  @ApiProperty({ enum: [true] }) educationalOnly!: true;
  @ApiProperty({ type: String, nullable: true }) protocolHash!: string | null;
  @ApiProperty() currentReviewNumber!: number;
  @ApiProperty({ type: ProtocolReviewResponseDto, nullable: true }) latestReview!: ProtocolReviewResponseDto | null;
  @ApiProperty() approvalUsable!: boolean;
  @ApiProperty({ type: [String] }) blockers!: string[];
}
export class ProtocolQueueItemDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() assessmentKey!: string;
  @ApiProperty() versionNumber!: number;
  @ApiProperty() title!: string;
  @ApiProperty() locale!: string;
  @ApiProperty() contentHash!: string;
  @ApiProperty() status!: string;
  @ApiProperty() currentReviewNumber!: number;
  @ApiProperty({ type: String, enum: ['APPROVED', 'WITHDRAWN'], nullable: true }) latestRecordedDecision!: string | null;
}
export class ProtocolQueuePageDto {
  @ApiProperty({ type: [ProtocolQueueItemDto] }) items!: ProtocolQueueItemDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
}
