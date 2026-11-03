import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Equals, IsIn, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { MarriageDefinitionDto } from '../offerings/assessment-offerings.dto';
import { CoupleLinkPolicyDto } from './couple-link.dto';

export class MarriageRequestCreateDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') publicationId!: string;
  @ApiProperty({ enum: ['FIRST','SECOND'] }) @IsIn(['FIRST','SECOND']) initiatorRole!: 'FIRST'|'SECOND';
  @ApiProperty({ maxLength: 32 }) @IsString() @MaxLength(32) recipientPhone!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') consentPolicyVersionId!: string;
  @ApiProperty({ enum: [true] }) @Equals(true) consentAccepted!: true;
}
export class MarriageRequestAcceptDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') consentPolicyVersionId!: string;
  @ApiProperty({ enum: [true] }) @Equals(true) consentAccepted!: true;
}
export class MarriageSettingsDto {
  @ApiProperty({ format: 'uuid' }) publicationId!: string;
  @ApiProperty() title!: string;
  @ApiProperty() amountRial!: string;
  @ApiProperty({ type: MarriageDefinitionDto }) definition!: MarriageDefinitionDto;
  @ApiProperty({ type: [String] }) eligibleRoles!: string[];
  @ApiProperty({ type: CoupleLinkPolicyDto }) linkingPolicy!: CoupleLinkPolicyDto;
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
