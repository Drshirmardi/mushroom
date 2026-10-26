import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, Matches } from 'class-validator';
import { GuidanceContentResponseDto } from '../../../content/guidance/guidance-content.dto';
export class CoupleAssessmentBillingIntentDto {
  @ApiProperty({ pattern: '^[a-f0-9]{64}$' }) @Matches(/^[a-f0-9]{64}$/u) contextHash!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') termsConsentRecordId!: string;
}
export class CoupleAssessmentOfferingPreviewDto {
  @ApiProperty({ format: 'uuid' }) publicationId!: string;
  @ApiProperty() publicationHash!: string;
  @ApiProperty() title!: string;
  @ApiProperty() amountRial!: string;
  @ApiProperty({ enum: ['IRR'] }) currency!: string;
  @ApiProperty({ format: 'uuid' }) assessmentVersionId!: string;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) jointProtocolId!: string | null;
  @ApiProperty({ type: String, nullable: true }) jointProtocolHash!: string | null;
  @ApiProperty() available!: boolean;
  @ApiProperty({ type: [String] }) blockers!: string[];
}
export class CoupleAssessmentPaidStateDto {
  @ApiProperty({ format: 'uuid' }) coupleAssessmentId!: string;
  @ApiProperty({ enum: ['UNPAID', 'PENDING', 'PAID', 'EXPIRED', 'CANCELLED', 'COMPENSATED'] }) paymentState!: string;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) ownIntentId!: string | null;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) ownPurchaseId!: string | null;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) ownAccessGrantId!: string | null;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) ownSubmissionId!: string | null;
  @ApiProperty({ type: String, nullable: true, enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETE', 'INVALIDATED'] }) ownAssessmentState!: string | null;
  @ApiProperty() ownStartAvailable!: boolean;
  @ApiProperty({ enum: ['UNAVAILABLE', 'PENDING', 'COMPLETE'] }) partnerCompletion!: string;
  @ApiProperty({ enum: ['AWAITING_PAYMENT', 'SHARING_UNAVAILABLE', 'AWAITING_COMPLETION', 'READY_TO_GENERATE', 'AVAILABLE'] }) jointResultState!: string;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) jointResultId!: string | null;
}
export class CoupleJointResultDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) coupleAssessmentId!: string;
  @ApiProperty({ format: 'uuid' }) jointProtocolId!: string;
  @ApiProperty({ enum: ['APPROVED_PAIR_LOOKUP'] }) algorithmId!: string;
  @ApiProperty({ enum: [1] }) algorithmVersion!: number;
  @ApiProperty() contentHash!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ enum: [true] }) educationalOnly!: true;
  @ApiProperty({ type: [GuidanceContentResponseDto] }) content!: GuidanceContentResponseDto[];
  @ApiProperty() recommendConsultation!: boolean;
}
