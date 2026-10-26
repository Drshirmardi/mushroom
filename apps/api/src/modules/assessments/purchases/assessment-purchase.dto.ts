import { ApiProperty } from '@nestjs/swagger';
import { Equals, IsUUID, Matches } from 'class-validator';
import { BillingIntentDto } from '../../billing/billing.dto';
import { CommercialPolicyDto, CommercialTermsDto, PublicationListQueryDto } from '../publication/assessment-publication.dto';
import { ProtocolConsentDto } from '../protocol/assessment-protocol.dto';

export class AssessmentPurchasePageQueryDto extends PublicationListQueryDto {}
export class AssessmentPurchaseIntentDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') publicationId!: string;
  @ApiProperty({ pattern: '^[a-f0-9]{64}$' }) @Matches(/^[a-f0-9]{64}$/u) publicationHash!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') processingConsentRecordId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') termsConsentRecordId!: string;
}
export class AssessmentConsentAcceptDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') policyVersionId!: string;
  @ApiProperty({ pattern: '^[a-f0-9]{64}$' }) @Matches(/^[a-f0-9]{64}$/u) contentHash!: string;
  @ApiProperty({ enum: [true] }) @Equals(true) accepted!: true;
}
export class AssessmentConsentRecordDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) policyVersionId!: string;
  @ApiProperty() contentHash!: string;
  @ApiProperty({ format: 'date-time' }) acceptedAt!: Date;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) withdrawnAt!: Date | null;
}
export class PatientAssessmentOfferingDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() offeringKey!: string;
  @ApiProperty() publicationNumber!: number;
  @ApiProperty({ enum: ['INDIVIDUAL', 'COUPLES'] }) kind!: string;
  @ApiProperty() locale!: string;
  @ApiProperty() amountRial!: string;
  @ApiProperty({ enum: ['IRR'] }) currency!: string;
  @ApiProperty() publicationHash!: string;
  @ApiProperty({ enum: [true] }) availabilityCheckRequired!: true;
}
export class PatientAssessmentOfferingPageDto {
  @ApiProperty({ type: [PatientAssessmentOfferingDto] }) items!: PatientAssessmentOfferingDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
export class PatientAssessmentOfferingDetailDto extends PatientAssessmentOfferingDto {
  @ApiProperty({ type: CommercialPolicyDto }) policy!: CommercialPolicyDto;
  @ApiProperty({ type: ProtocolConsentDto }) processingPolicy!: ProtocolConsentDto;
  @ApiProperty({ type: CommercialTermsDto }) termsPolicy!: CommercialTermsDto;
  @ApiProperty({ type: AssessmentConsentRecordDto, nullable: true }) processingConsent!: AssessmentConsentRecordDto | null;
  @ApiProperty({ type: AssessmentConsentRecordDto, nullable: true }) termsConsent!: AssessmentConsentRecordDto | null;
  @ApiProperty() purchaseSupported!: boolean;
  @ApiProperty({ type: [String] }) blockers!: string[];
}
export class AssessmentGrantSummaryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) submissionId!: string | null;
  @ApiProperty() accessAvailable!: boolean;
  @ApiProperty({ format: 'date-time' }) grantedAt!: Date;
}
export class PatientAssessmentPurchaseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) publicationId!: string;
  @ApiProperty() title!: string;
  @ApiProperty() amountRial!: string;
  @ApiProperty({ enum: ['IRR'] }) currency!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ type: BillingIntentDto, nullable: true }) intent!: BillingIntentDto | null;
  @ApiProperty({ type: [AssessmentGrantSummaryDto] }) grants!: AssessmentGrantSummaryDto[];
}
export class PatientAssessmentPurchasePageDto {
  @ApiProperty({ type: [PatientAssessmentPurchaseDto] }) items!: PatientAssessmentPurchaseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
