import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Equals, IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { MarriageDefinitionDto } from '../offerings/assessment-offerings.dto';
import { CoupleSessionListQueryDto, CoupleLinkPolicyDto } from './couple-link.dto';

export class MarriageRequestListQueryDto extends CoupleSessionListQueryDto {
  @ApiPropertyOptional({ enum: ['PENDING','ACCEPTED','CANCELLED','REPLACED'] }) @IsOptional() @IsIn(['PENDING','ACCEPTED','CANCELLED','REPLACED']) status?: 'PENDING'|'ACCEPTED'|'CANCELLED'|'REPLACED';
  @ApiPropertyOptional({ enum: ['SENT','RECEIVED'] }) @IsOptional() @IsIn(['SENT','RECEIVED']) direction?: 'SENT'|'RECEIVED';
}

export class MarriageRequestCreateDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') publicationId!: string;
  @ApiProperty({ enum: ['FIRST','SECOND'] }) @IsIn(['FIRST','SECOND']) initiatorRole!: 'FIRST'|'SECOND';
  @ApiProperty({ maxLength: 32 }) @IsString() @MaxLength(32) recipientPhone!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') consentPolicyVersionId!: string;
  @ApiProperty({ enum: [true] }) @Equals(true) consentAccepted!: true;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4') paidIntentId?: string;
}
export class MarriageRequestAcceptDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') consentPolicyVersionId!: string;
  @ApiProperty({ enum: [true] }) @Equals(true) consentAccepted!: true;
}
export class MarriagePrepaymentStatusDto {
  @ApiProperty({ format: 'uuid' }) intentId!: string;
  @ApiProperty({ enum: ['PENDING', 'PAID'] }) status!: 'PENDING' | 'PAID';
  @ApiProperty() amountRial!: string;
}
export class MarriagePrepaidBillingDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') termsConsentRecordId!: string;
}
export class MarriageRefundPrepaymentResultDto {
  @ApiProperty() success!: boolean;
  @ApiProperty() refundedAmountRial!: string;
}
export class MarriageSettingsDto {
  @ApiProperty({ format: 'uuid' }) publicationId!: string;
  @ApiProperty() title!: string;
  @ApiProperty() amountRial!: string;
  @ApiProperty({ type: MarriageDefinitionDto }) definition!: MarriageDefinitionDto;
  @ApiProperty({ type: [String] }) eligibleRoles!: string[];
  @ApiProperty({ type: CoupleLinkPolicyDto }) linkingPolicy!: CoupleLinkPolicyDto;
  @ApiPropertyOptional({ type: CoupleLinkPolicyDto }) termsPolicy?: CoupleLinkPolicyDto;
  @ApiPropertyOptional({ type: MarriagePrepaymentStatusDto, nullable: true }) prepayment?: MarriagePrepaymentStatusDto | null;
}
export class MarriageContinuationDto {
  @ApiProperty() profileRequired!: boolean;
  @ApiProperty() nextPath!: string;
}
export class MarriageRequestDto {
  @ApiProperty({ type: MarriageContinuationDto }) continuation!: MarriageContinuationDto;
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: ['PENDING','ACCEPTED','CANCELLED','REPLACED'] }) status!: string;
  @ApiProperty() isInitiator!: boolean;
  @ApiProperty({ type: String, nullable: true, description: 'Original invitation destination masked for the requester only; null for recipient.' }) recipientPhoneMasked!: string|null;
  @ApiProperty({ type: String, nullable: true }) initiatorName!: string|null;
  @ApiProperty({ type: String, nullable: true, enum: ['PROFILE_INCOMPLETE','GENDER_NOT_ALLOWED','AGE_BELOW_MINIMUM'] }) ownIneligibilityReason!: string|null;
  @ApiProperty() ownEligible!: boolean;
  @ApiProperty() eligibilityNotConfirmed!: boolean;
  @ApiProperty({ enum: ['FIRST','SECOND'] }) ownRole!: string;
  @ApiProperty({ type: MarriageSettingsDto }) service!: MarriageSettingsDto;
  @ApiProperty() invitationPath!: string;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) educationalId!: string|null;
  @ApiProperty({ type: String, nullable: true, enum: ['QUEUED','SENDING','ACCEPTED','FAILED','UNKNOWN'] }) smsStatus!: string|null;
  @ApiProperty() createdAt!: Date;
}
export class MarriageRequestPageDto {
  @ApiProperty({ type: [MarriageRequestDto] }) items!: MarriageRequestDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
