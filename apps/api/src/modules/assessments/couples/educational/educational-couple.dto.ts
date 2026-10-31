import { ApiProperty } from '@nestjs/swagger';
import { Equals, IsUUID, Matches } from 'class-validator';
import { CoupleAssessmentQueryDto, CoupleAssessmentParticipantDto } from '../participation/couple-assessment.dto';
import { ProtocolConsentDto } from '../../protocol/assessment-protocol.dto';
import { CommercialTermsDto } from '../../publication/assessment-publication.dto';

export class EducationalCoupleCreateDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') coupleSessionId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') publicationId!: string;
  @ApiProperty() @Matches(/^[a-f0-9]{64}$/u) publicationHash!: string;
}
export class EducationalCoupleAcceptDto {
  @ApiProperty() @Matches(/^[a-f0-9]{64}$/u) contextHash!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') processingConsentRecordId!: string;
  @ApiProperty() @Matches(/^[a-f0-9]{64}$/u) disclosureContentHash!: string;
  @ApiProperty({ enum: [true] }) @Equals(true) disclosureAccepted!: true;
  @ApiProperty({ enum: [true] }) @Equals(true) linkedPartnerAcknowledged!: true;
}
export class EducationalCoupleQueryDto extends CoupleAssessmentQueryDto {}
export class EducationalCoupleBillingDto {
  @ApiProperty() @Matches(/^[a-f0-9]{64}$/u) contextHash!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') termsConsentRecordId!: string;
}
export class EducationalCoupleDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) coupleSessionId!: string;
  @ApiProperty({ format: 'uuid' }) publicationId!: string;
  @ApiProperty() contextHash!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ enum: ['FREE', 'PAID'] }) priceMode!: string;
  @ApiProperty() amountRial!: string;
  @ApiProperty({ enum: ['IRR'] }) currency!: string;
  @ApiProperty({ type: [CoupleAssessmentParticipantDto] }) participants!: CoupleAssessmentParticipantDto[];
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) ownAccessGrantId!: string | null;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) ownSubmissionId!: string | null;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) ownProcessingConsentRecordId!: string | null;
  @ApiProperty() mutualConsentComplete!: boolean;
  @ApiProperty() jointResultAvailable!: boolean;
  @ApiProperty() newAccessAvailable!: boolean;
}
export class EducationalCoupleDetailDto extends EducationalCoupleDto {
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) ownPendingIntentId!: string | null;
  @ApiProperty() paymentPending!: boolean;
  @ApiProperty({ type: CommercialTermsDto, nullable: true }) termsPolicy!: CommercialTermsDto | null;
  @ApiProperty({ type: ProtocolConsentDto }) processingPolicy!: ProtocolConsentDto;
  @ApiProperty({ type: ProtocolConsentDto }) disclosurePolicy!: ProtocolConsentDto;
}
export class EducationalCouplePageDto {
  @ApiProperty({ type: [EducationalCoupleDto] }) items!: EducationalCoupleDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
}
export class EducationalCoupleIndividualResultDto {
  @ApiProperty({ enum: ['INITIATOR', 'PARTNER'] }) slot!: string;
  @ApiProperty() isSelf!: boolean;
  @ApiProperty({ type: 'object', additionalProperties: true }) resultSnapshot!: Record<string, unknown>;
}
export class EducationalCoupleResultDto {
  @ApiProperty({ type: [EducationalCoupleIndividualResultDto], minItems: 2, maxItems: 2 }) results!: EducationalCoupleIndividualResultDto[];
  @ApiProperty({ type: String, nullable: true }) jointText!: string | null;
}
