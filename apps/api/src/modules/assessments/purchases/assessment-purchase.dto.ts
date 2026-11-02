import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Equals, IsUUID, Matches } from 'class-validator';
import { BillingIntentDto } from '../../billing/billing.dto';
import { CommercialPolicyDto, CommercialTermsDto, PublicationListQueryDto } from '../publication/assessment-publication.dto';
import { ProtocolConsentDto } from '../protocol/assessment-protocol.dto';

export class AssessmentPurchasePageQueryDto extends PublicationListQueryDto {}
export class AssessmentFreeAccessDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') publicationId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') processingConsentRecordId!: string;
}
export class AssessmentFreeGrantDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: ['FREE'] }) accessMode!: 'FREE';
  @ApiProperty({ format: 'uuid' }) publicationId!: string;
  @ApiProperty({ format: 'date-time' }) grantedAt!: Date;
}
export class EducationalAssessmentOfferingDto {
  @ApiPropertyOptional({ enum: ['MARRIAGE'], nullable: true }) servicePurpose?: string | null;
  @ApiProperty() publicationHash!: string;
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) offeringVersionId!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ enum: ['INDIVIDUAL', 'COUPLES'] }) kind!: string;
  @ApiProperty({ enum: ['FREE', 'PAID'] }) priceMode!: string;
  @ApiProperty({ type: String, nullable: true }) amountRial!: string | null;
  @ApiProperty() currency!: string;
  @ApiProperty({ type: String, nullable: true }) algorithmId!: string | null;
  @ApiProperty({ type: Number, nullable: true }) algorithmVersion!: number | null;
  @ApiProperty({ enum: ['ADMIN_PUBLISHED'] }) publicationAuthority!: 'ADMIN_PUBLISHED';
}
export class EducationalAssessmentOfferingDetailDto extends EducationalAssessmentOfferingDto {
  @ApiPropertyOptional() publicPurchaseAvailable?: boolean;
  @ApiPropertyOptional({type:String,nullable:true,format:'uuid'}) pendingIntentId?: string|null;
  @ApiProperty({ type: CommercialTermsDto, nullable: true }) termsPolicy!: CommercialTermsDto | null;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) termsConsentId!: string | null;
  @ApiProperty({ type: ProtocolConsentDto, nullable: true }) processingPolicy!: ProtocolConsentDto | null;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) processingConsentId!: string | null;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) accessGrantId!: string | null;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) submissionId!: string | null;
  @ApiProperty() accessSupported!: boolean;
  @ApiProperty({ type: [String] }) blockers!: string[];
}
export class EducationalAssessmentOfferingPageDto {
  @ApiProperty({ type: [EducationalAssessmentOfferingDto] }) items!: EducationalAssessmentOfferingDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
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
  @ApiProperty({ description: 'Owned consent and conditions page for the exact publication authority.' }) managementHref!: string;
  @ApiProperty({ enum: ['PAID'] }) accessMode!: 'PAID';
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
