import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Equals, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';

export class CoupleLinkConsentDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') consentPolicyVersionId!: string;
  @ApiProperty({ enum: [true] }) @Equals(true) consentAccepted!: true;
}
export class CoupleInvitationCreateDto {
  @ApiProperty({ format: 'uuid', description: 'Existing self-profile routing address deliberately shared by the recipient; does not authenticate or grant consent' })
  @IsUUID('4') recipientPatientId!: string;
  @ApiProperty({ maxLength: 32, description: 'Registered recipient mobile; normalized with the existing identity rules and never copied into invitation records' })
  @IsString() @MaxLength(32) recipientPhone!: string;
}
export class CoupleInvitationTokenDto {
  @ApiProperty({ minLength: 43, maxLength: 43, pattern: '^[A-Za-z0-9_-]{43}$', writeOnly: true })
  @IsString() @Matches(/^[A-Za-z0-9_-]{43}$/u) invitationToken!: string;
}
export class CoupleInvitationAcceptDto extends CoupleInvitationTokenDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') consentPolicyVersionId!: string;
  @ApiProperty({ enum: [true] }) @Equals(true) consentAccepted!: true;
}
export class CoupleSessionListQueryDto {
  @ApiPropertyOptional({ type: 'integer', minimum: 1, maximum: 10000, default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) page = 1;
  @ApiPropertyOptional({ type: 'integer', minimum: 1, maximum: 50, default: 20 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) pageSize = 20;
}
export class CoupleParticipantSummaryDto {
  @ApiProperty({ enum: ['INITIATOR', 'PARTNER'] }) slot!: string;
  @ApiProperty() isSelf!: boolean;
  @ApiProperty({ enum: ['ACCEPTED', 'REVOKED'] }) consentState!: string;
}
export class CoupleSessionSummaryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: ['AWAITING_PARTNER', 'LINKED', 'CONSENT_REVOKED'] }) state!: string;
  @ApiProperty({ enum: [18] }) minimumAgeYears!: number;
  @ApiProperty({ format: 'uuid' }) consentPolicyVersionId!: string;
  @ApiProperty({ type: [CoupleParticipantSummaryDto], maxItems: 2 }) participants!: CoupleParticipantSummaryDto[];
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ format: 'date-time' }) updatedAt!: Date;
  @ApiProperty({ enum: [false], description: 'Account linking grants no medical-processing, payment entitlement or joint-result access' }) assessmentReady!: false;
}
export class CoupleSessionPageDto {
  @ApiProperty({ type: [CoupleSessionSummaryDto] }) items!: CoupleSessionSummaryDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
}
export class CoupleLinkPolicyDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() versionNumber!: number;
  @ApiProperty({ enum: ['COUPLES_ACCOUNT_LINKING'] }) policyKey!: string;
  @ApiProperty({ enum: ['fa-IR'] }) locale!: string;
  @ApiProperty() title!: string;
  @ApiProperty() body!: string;
  @ApiProperty() contentHash!: string;
}
export class CoupleInvitationResponseDto {
  @ApiProperty({ format: 'uuid' }) invitationId!: string;
  @ApiProperty({ format: 'uuid' }) sessionId!: string;
  @ApiProperty({ enum: ['PENDING', 'ACCEPTED', 'REVOKED'] }) status!: string;
  @ApiProperty({ type: String, nullable: true, description: 'Always null: invitations have no automatic deadline' }) expiresAt!: null;
  @ApiProperty({ type: String, nullable: true, description: 'Returned only on first issuance; replay cannot recover the plaintext secret' }) invitationToken!: string | null;
}
export class CoupleInvitationPreviewDto {
  @ApiProperty({ type: CoupleSessionSummaryDto }) session!: CoupleSessionSummaryDto;
  @ApiProperty({ type: CoupleLinkPolicyDto }) policy!: CoupleLinkPolicyDto;
  @ApiProperty({ type: String, nullable: true }) expiresAt!: null;
}
