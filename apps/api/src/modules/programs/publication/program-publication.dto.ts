import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Equals, IsIn, IsInt, IsOptional, IsUUID, Matches, Max, Min } from 'class-validator';
export class ProgramCommercialConfigDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') programDefinitionId!: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4') termsPolicyVersionId?: string;
  @ApiProperty({ pattern: '^(0|[1-9][0-9]{0,18})$' }) @Matches(/^(0|[1-9][0-9]{0,18})$/u) amountRial!: string;
  @ApiProperty({ enum: ['IRR'] }) @Equals('IRR') currency!: 'IRR';
  @ApiProperty({ enum: ['PERPETUAL', 'DAYS', 'ONE_DELIVERY'] }) @IsIn(['PERPETUAL', 'DAYS', 'ONE_DELIVERY']) accessMode!: 'PERPETUAL' | 'DAYS' | 'ONE_DELIVERY';
  @ApiPropertyOptional({ type: Number, nullable: true, minimum: 1, maximum: 3650 }) @IsOptional() @IsInt() @Min(1) @Max(3650) accessDurationDays?: number | null;
  @ApiProperty({ minimum: 60, maximum: 86400 }) @IsInt() @Min(60) @Max(86400) quoteTtlSeconds!: number;
  @ApiPropertyOptional({ type: String, nullable: true }) @IsOptional() @Matches(/^[A-Za-z0-9._:-]{1,80}$/u) retentionPolicyRef?: string | null;
}
export class PublishProgramOfferingDto extends ProgramCommercialConfigDto {
  @ApiProperty({ pattern: '^[a-f0-9]{64}$' }) @Matches(/^[a-f0-9]{64}$/u) publicationHash!: string;
  @ApiProperty({ minimum: 0, maximum: 2147483646 }) @IsInt() @Min(0) @Max(2147483646) expectedPublicationNumber!: number;
  @ApiProperty({ enum: [true] }) @Equals(true) reviewedTermsAndRetention!: true;
}
export class ProgramPublicationQueryDto {
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) page = 1;
  @ApiPropertyOptional({ default: 20 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) pageSize = 20;
  @ApiPropertyOptional() @IsOptional() @Matches(/^[A-Z][A-Z0-9_]{2,99}$/u) programKey?: string;
  @ApiPropertyOptional({ enum: ['ACTIVE', 'RETIRED'] }) @IsOptional() @IsIn(['ACTIVE', 'RETIRED']) status?: string;
}
export class ProgramCommercialPolicyDto {
  @ApiProperty({ enum: [1] }) schemaVersion!: 1;
  @ApiProperty({ enum: [false] }) ordinaryRefunds!: false;
  @ApiProperty({ enum: ['PRE_ACCESS_OR_REQUEST'] }) paymentPoint!: 'PRE_ACCESS_OR_REQUEST';
}
export class ProgramCommercialDefinitionDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() programKey!: string;
  @ApiProperty() locale!: string;
  @ApiProperty() kind!: string;
  @ApiProperty() title!: string;
  @ApiProperty() contentHash!: string;
  @ApiProperty() status!: string;
  @ApiProperty() usable!: boolean;
}
export class ProgramPurchaseTermsDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: ['PROGRAM_PURCHASE_TERMS', 'READY_PROGRAM_PURCHASE_TERMS'] }) policyKey!: 'PROGRAM_PURCHASE_TERMS' | 'READY_PROGRAM_PURCHASE_TERMS';
  @ApiProperty() versionNumber!: number;
  @ApiProperty() locale!: string;
  @ApiProperty() title!: string;
  @ApiProperty() body!: string;
  @ApiProperty() contentHash!: string;
}
export class ProgramCommercialPreviewDto {
  @ApiProperty({ type: ProgramCommercialConfigDto }) configuration!: ProgramCommercialConfigDto;
  @ApiProperty({ type: ProgramCommercialDefinitionDto }) definition!: ProgramCommercialDefinitionDto;
  @ApiProperty({ type: ProgramPurchaseTermsDto, nullable: true }) termsPolicy!: ProgramPurchaseTermsDto | null;
  @ApiProperty({ type: ProgramCommercialPolicyDto }) policy!: ProgramCommercialPolicyDto;
  @ApiProperty({ type: String, nullable: true }) publicationHash!: string | null;
  @ApiProperty() expectedPublicationNumber!: number;
  @ApiProperty() configurationReady!: boolean;
  @ApiProperty({ type: [String] }) blockers!: string[];
  @ApiProperty({ enum: [false] }) checkoutAvailable!: false;
}
export class ProgramPublicationResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) programDefinitionId!: string;
  @ApiProperty() definitionContentHash!: string;
  @ApiProperty() programKey!: string;
  @ApiProperty() locale!: string;
  @ApiProperty() publicationNumber!: number;
  @ApiProperty() amountRial!: string;
  @ApiProperty({ enum: ['FREE', 'PAID'] }) priceMode!: 'FREE' | 'PAID';
  @ApiProperty({ enum: ['IRR'] }) currency!: string;
  @ApiProperty({ enum: ['PERPETUAL', 'DAYS', 'ONE_DELIVERY'] }) accessMode!: string;
  @ApiProperty({ type: Number, nullable: true }) accessDurationDays!: number | null;
  @ApiProperty() quoteTtlSeconds!: number;
  @ApiProperty({ type: String, nullable: true }) retentionPolicyRef!: string | null;
  @ApiProperty({ format: 'uuid' }) termsPolicyVersionId!: string;
  @ApiProperty() termsContentHash!: string;
  @ApiProperty({ type: ProgramCommercialPolicyDto }) policy!: ProgramCommercialPolicyDto;
  @ApiProperty() publicationHash!: string;
  @ApiProperty({ enum: ['ACTIVE', 'RETIRED'] }) status!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) retiredAt!: Date | null;
  @ApiProperty({ type: String, nullable: true, enum: ['REPLACED', 'MANUAL'] }) retirementReason!: string | null;
  @ApiProperty() configurationReady!: boolean;
  @ApiProperty({ enum: [false] }) checkoutAvailable!: false;
}
export class ProgramPublicationPageDto {
  @ApiProperty({ type: [ProgramPublicationResponseDto] }) items!: ProgramPublicationResponseDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
}
export class ProgramStaticTermsDto {
  @ApiProperty() title!: string;
  @ApiProperty() body!: string;
  @ApiProperty({ enum: [1] }) versionNumber!: 1;
}
export class ProgramPublicationSetupDto {
  @ApiProperty({ type: ProgramStaticTermsDto, nullable: true }) defaultTerms!: ProgramStaticTermsDto | null;
  @ApiProperty({ type: ProgramPublicationResponseDto, nullable: true }) latestPublication!: ProgramPublicationResponseDto | null;
  @ApiProperty({ type: ProgramPurchaseTermsDto, nullable: true }) termsPolicy!: ProgramPurchaseTermsDto | null;
  @ApiProperty({ type: String, nullable: true }) suggestedRetentionPolicyRef!: string | null;
}
