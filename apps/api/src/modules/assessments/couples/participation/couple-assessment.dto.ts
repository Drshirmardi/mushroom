import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Equals, IsOptional, IsUUID, Matches } from 'class-validator';
import { CoupleSessionListQueryDto } from '../couple-link.dto';
import { ProtocolConsentDto } from '../../protocol/assessment-protocol.dto';
export class CoupleAssessmentCreateDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') coupleSessionId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') publicationId!: string;
  @ApiProperty({ pattern: '^[a-f0-9]{64}$' }) @Matches(/^[a-f0-9]{64}$/u) publicationHash!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') jointProtocolId!: string;
  @ApiProperty({ pattern: '^[a-f0-9]{64}$' }) @Matches(/^[a-f0-9]{64}$/u) jointProtocolHash!: string;
}
export class CoupleAssessmentConsentDto {
  @ApiProperty({ pattern: '^[a-f0-9]{64}$' }) @Matches(/^[a-f0-9]{64}$/u) contextHash!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') processingConsentRecordId!: string;
  @ApiProperty({ enum: [true] }) @Equals(true) jointDisclosureAccepted!: true;
  @ApiProperty({ enum: [true] }) @Equals(true) linkedPartnerAcknowledged!: true;
}
export class CoupleAssessmentQueryDto extends CoupleSessionListQueryDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4') coupleSessionId?: string;
}
export class CoupleAssessmentParticipantDto {
  @ApiProperty({ enum: ['INITIATOR', 'PARTNER'] }) slot!: string;
  @ApiProperty() isSelf!: boolean;
  @ApiProperty({ enum: ['PENDING', 'ACCEPTED', 'WITHDRAWN'] }) consentState!: string;
}
export class CoupleAssessmentOwnConsentDto {
  @ApiProperty({ type: String, format: 'uuid', nullable: true }) processingConsentRecordId!: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) acceptedAt!: Date | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) withdrawnAt!: Date | null;
}
export class CoupleAssessmentDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) coupleSessionId!: string;
  @ApiProperty({ format: 'uuid' }) publicationId!: string;
  @ApiProperty({ format: 'uuid' }) jointProtocolId!: string;
  @ApiProperty({ format: 'uuid' }) assessmentVersionId!: string;
  @ApiProperty() title!: string;
  @ApiProperty() amountRial!: string;
  @ApiProperty({ enum: ['IRR'] }) currency!: string;
  @ApiProperty() contextHash!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ type: [CoupleAssessmentParticipantDto], maxItems: 2 }) participants!: CoupleAssessmentParticipantDto[];
  @ApiProperty({ type: CoupleAssessmentOwnConsentDto }) ownConsent!: CoupleAssessmentOwnConsentDto;
  @ApiProperty() mutualConsentComplete!: boolean;
  @ApiProperty({ type: [String] }) blockers!: string[];
}
export class CoupleAssessmentDetailDto extends CoupleAssessmentDto {
  @ApiProperty({ type: ProtocolConsentDto }) processingPolicy!: ProtocolConsentDto;
  @ApiProperty({ type: ProtocolConsentDto }) jointDisclosurePolicy!: ProtocolConsentDto;
}
export class CoupleAssessmentPageDto {
  @ApiProperty({ type: [CoupleAssessmentDto] }) items!: CoupleAssessmentDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
