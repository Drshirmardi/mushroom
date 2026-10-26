import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Equals, IsInt, IsOptional, IsUUID, Matches, Max, Min } from 'class-validator';
import { BillingIntentDto } from '../../billing/billing.dto';
import { GuidanceSafetyDto } from '../../content/guidance/guidance-content.dto';
import { ProgramContentReferenceDto } from '../definitions/program-definition.dto';

export class ProgramPurchaseQueryDto {
  @ApiPropertyOptional({ type: Number, default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) page = 1;
  @ApiPropertyOptional({ type: Number, default: 20 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) pageSize = 20;
}
export class ProgramConsentAcceptDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') policyVersionId!: string;
  @ApiProperty({ pattern: '^[a-f0-9]{64}$' }) @Matches(/^[a-f0-9]{64}$/u) contentHash!: string;
  @ApiProperty({ enum: [true] }) @Equals(true) accepted!: true;
}
export class ProgramPurchaseIntentDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') publicationId!: string;
  @ApiProperty({ pattern: '^[a-f0-9]{64}$' }) @Matches(/^[a-f0-9]{64}$/u) publicationHash!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') termsConsentRecordId!: string;
}
export class ProgramConsentRecordDto {
  @ApiProperty() id!: string;
  @ApiProperty() policyVersionId!: string;
  @ApiProperty() contentHash!: string;
  @ApiProperty({ format: 'date-time' }) acceptedAt!: string;
}
export class ProgramTermsDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() body!: string;
  @ApiProperty() contentHash!: string;
}
export class PatientProgramOfferingDto {
  @ApiProperty() id!: string;
  @ApiProperty() programDefinitionId!: string;
  @ApiProperty() versionNumber!: number;
  @ApiProperty() title!: string;
  @ApiProperty() summary!: string;
  @ApiProperty() category!: string;
  @ApiProperty() locale!: string;
  @ApiProperty() eligibilityDescription!: string;
  @ApiProperty({ type: GuidanceSafetyDto }) safety!: GuidanceSafetyDto;
  @ApiProperty() amountRial!: string;
  @ApiProperty({ enum: ['IRR'] }) currency!: string;
  @ApiProperty({ enum: ['DAYS', 'PERPETUAL'] }) accessMode!: string;
  @ApiProperty({ type: Number, nullable: true }) accessDurationDays!: number | null;
  @ApiProperty() publicationHash!: string;
  @ApiProperty({ enum: [false] }) ordinaryRefunds!: false;
  @ApiProperty({ enum: [true] }) educationalOnly!: true;
  @ApiProperty({ enum: [true] }) availabilityCheckRequired!: true;
  @ApiProperty({ type: ProgramTermsDto }) terms!: ProgramTermsDto;
  @ApiProperty({ type: ProgramConsentRecordDto, nullable: true }) termsConsent!: ProgramConsentRecordDto | null;
}
export class PatientProgramOfferingPageDto {
  @ApiProperty({ type: [PatientProgramOfferingDto] }) items!: PatientProgramOfferingDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
export class ProgramGrantDto {
  @ApiProperty() id!: string;
  @ApiProperty({ format: 'date-time' }) grantedAt!: Date;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) endsAt!: Date | null;
  @ApiProperty() accessAvailable!: boolean;
}
export class PatientProgramPurchaseDto {
  @ApiProperty({ enum: ['READY_EDUCATION','CUSTOM_PROFESSIONAL_PLAN'] }) kind!: string;
  @ApiProperty({ type: String, nullable: true }) customRequestId!: string | null;
  @ApiProperty() id!: string;
  @ApiProperty() publicationId!: string;
  @ApiProperty() programDefinitionId!: string;
  @ApiProperty() title!: string;
  @ApiProperty() amountRial!: string;
  @ApiProperty({ enum: ['IRR'] }) currency!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ type: BillingIntentDto, nullable: true }) intent!: BillingIntentDto | null;
  @ApiProperty({ type: ProgramGrantDto, nullable: true }) grant!: ProgramGrantDto | null;
}
export class PatientProgramPurchasePageDto {
  @ApiProperty({ type: [PatientProgramPurchaseDto] }) items!: PatientProgramPurchaseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
export class PatientProgramContentDto extends ProgramGrantDto {
  @ApiProperty() purchaseId!: string;
  @ApiProperty() programDefinitionId!: string;
  @ApiProperty() versionNumber!: number;
  @ApiProperty() contentHash!: string;
  @ApiProperty() title!: string;
  @ApiProperty() body!: string;
  @ApiProperty({ type: GuidanceSafetyDto }) safety!: GuidanceSafetyDto;
  @ApiProperty({ type: [ProgramContentReferenceDto] }) contentReferences!: ProgramContentReferenceDto[];
  @ApiProperty({ enum: [true] }) educationalOnly!: true;
}
