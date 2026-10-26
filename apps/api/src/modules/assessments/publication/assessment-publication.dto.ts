import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Equals, IsInt, IsUUID, Matches, Max, Min } from 'class-validator';
import { AssessmentOfferingListQueryDto, AssessmentOfferingVersionResponseDto } from '../offerings/assessment-offerings.dto';
import { ProtocolConsentDto } from '../protocol/assessment-protocol.dto';

export class PublicationListQueryDto extends AssessmentOfferingListQueryDto {}
export class PublicationPreviewQueryDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') offeringVersionId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') termsPolicyVersionId!: string;
}
export class PublishAssessmentOfferingDto extends PublicationPreviewQueryDto {
  @ApiProperty({ pattern: '^[a-f0-9]{64}$' }) @Matches(/^[a-f0-9]{64}$/u) publicationHash!: string;
  @ApiProperty({ minimum: 0, maximum: 2147483646 }) @IsInt() @Min(0) @Max(2147483646) expectedPublicationNumber!: number;
  @ApiProperty({ enum: [true] }) @Equals(true) reviewedTermsAndRetention!: true;
}
export class CommercialTariffDto extends OmitType(AssessmentOfferingVersionResponseDto, ['releaseReadiness', 'createdAt', 'retiredAt'] as const) {}
export class CommercialTermsDto extends OmitType(ProtocolConsentDto, ['policyKey'] as const) {
  @ApiProperty({ enum: ['ASSESSMENT_PURCHASE_TERMS'] }) policyKey!: string;
}
export class CommercialPolicyDto {
  @ApiProperty({ enum: [1] }) schemaVersion!: 1;
  @ApiProperty({ enum: [18] }) minimumAgeYears!: 18;
  @ApiProperty({ enum: ['PRE_START'] }) paymentPoint!: 'PRE_START';
  @ApiProperty({ enum: [false] }) ordinaryRefunds!: false;
  @ApiProperty({ enum: [false] }) patientCancellation!: false;
  @ApiProperty({ enum: [false] }) invitationAutomaticExpiry!: false;
  @ApiProperty({ enum: [false] }) entitlementAutomaticExpiry!: false;
}
export class PublicationPreviewDto {
  @ApiProperty({ type: CommercialTariffDto }) offering!: CommercialTariffDto;
  @ApiProperty({ type: CommercialTermsDto }) termsPolicy!: CommercialTermsDto;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) protocolReviewId!: string | null;
  @ApiProperty({ type: String, nullable: true }) protocolHash!: string | null;
  @ApiProperty({ type: CommercialPolicyDto }) policy!: CommercialPolicyDto;
  @ApiProperty({ type: String, nullable: true }) publicationHash!: string | null;
  @ApiProperty() expectedPublicationNumber!: number;
  @ApiProperty() configurationReady!: boolean;
  @ApiProperty({ type: [String] }) blockers!: string[];
}
export class PublicationRecordDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() offeringKey!: string;
  @ApiProperty() publicationNumber!: number;
  @ApiProperty({ type: CommercialTariffDto }) offering!: CommercialTariffDto;
  @ApiProperty({ format: 'uuid' }) protocolReviewId!: string;
  @ApiProperty({ format: 'uuid' }) termsPolicyVersionId!: string;
  @ApiProperty() termsContentHash!: string;
  @ApiProperty({ type: CommercialPolicyDto }) policy!: CommercialPolicyDto;
  @ApiProperty() publicationHash!: string;
  @ApiProperty({ enum: ['ACTIVE', 'RETIRED'] }) status!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) retiredAt!: Date | null;
  @ApiProperty({ type: String, nullable: true, enum: ['REPLACED', 'WITHDRAWN'] }) retirementReason!: string | null;
}
export class PublicationDetailDto extends PublicationRecordDto {
  @ApiProperty() commercialUsable!: boolean;
  @ApiProperty({ type: [String] }) blockers!: string[];
}
export class PublicationPageDto {
  @ApiProperty({ type: [PublicationRecordDto] }) items!: PublicationRecordDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
}
