import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Equals, IsInt, IsOptional, IsUUID, Matches, Max, Min } from 'class-validator';
import { GuidanceSafetyDto } from '../../content/guidance/guidance-content.dto';
import { ProgramTermsDto } from '../purchases/program-purchase.dto';
export class CustomProgramQueryDto {
  @ApiPropertyOptional({ type: Number, default: 1, minimum: 1, maximum: 10000 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) page: number = 1;
  @ApiPropertyOptional({ type: Number, default: 20, minimum: 1, maximum: 50 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) pageSize: number = 20;
}

export class CustomProgramRequestCreateDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') publicationId!: string;
  @ApiProperty({ pattern: '^[a-f0-9]{64}$' }) @Matches(/^[a-f0-9]{64}$/u) publicationHash!: string;
}
export class CustomProgramCareAcceptDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') policyVersionId!: string;
  @ApiProperty({ pattern: '^[a-f0-9]{64}$' }) @Matches(/^[a-f0-9]{64}$/u) contentHash!: string;
  @ApiProperty({ enum: [true] }) @Equals(true) accepted!: true;
  @ApiProperty({ minimum: 0, maximum: 2147483646 }) @IsInt() @Min(0) @Max(2147483646) expectedVersionNumber!: number;
}
export class CustomProgramBoundaryDto {
  @ApiProperty({ enum: [false] }) checkoutAvailable!: false;
  @ApiProperty({ enum: [false] }) clinicalDeliveryAvailable!: false;
  @ApiProperty({ type: [String] }) blockers!: string[];
}
export class CustomProgramPhysicianDto {
  @ApiProperty() id!: string;
  @ApiProperty() displayName!: string;
}
export class CustomProgramOfferingDto extends CustomProgramBoundaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() publicationHash!: string;
  @ApiProperty() programDefinitionId!: string;
  @ApiProperty() definitionContentHash!: string;
  @ApiProperty() title!: string;
  @ApiProperty() summary!: string;
  @ApiProperty() category!: string;
  @ApiProperty() locale!: string;
  @ApiProperty() eligibilityDescription!: string;
  @ApiProperty({ type: GuidanceSafetyDto }) safety!: GuidanceSafetyDto;
  @ApiProperty() doctorServiceId!: string;
  @ApiProperty({ type: CustomProgramPhysicianDto }) physician!: CustomProgramPhysicianDto;
  @ApiProperty() amountRial!: string;
  @ApiProperty({ enum: ['IRR'] }) currency!: string;
  @ApiProperty({ enum: [false] }) ordinaryRefunds!: false;
  @ApiProperty({ type: ProgramTermsDto }) terms!: ProgramTermsDto;
  @ApiProperty({ type: ProgramTermsDto, nullable: true }) carePolicy!: ProgramTermsDto | null;
  @ApiProperty() requestSupported!: boolean;
}
export class CustomProgramOfferingPageDto {
  @ApiProperty({ type: [CustomProgramOfferingDto] }) items!: CustomProgramOfferingDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
export class CustomProgramCareDto {
  @ApiProperty() id!: string;
  @ApiProperty() requestId!: string;
  @ApiProperty() versionNumber!: number;
  @ApiProperty() policyVersionId!: string;
  @ApiProperty() contentHash!: string;
  @ApiProperty() authorizationHash!: string;
  @ApiProperty({ format: 'date-time' }) acceptedAt!: Date;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) withdrawnAt!: Date | null;
  @ApiProperty({ type: String, nullable: true, enum: ['PATIENT_WITHDRAWAL', 'SUPERSEDED'] }) withdrawalReason!: string | null;
  @ApiProperty() careAuthorized!: boolean;
}
export class CustomProgramRequestDto extends CustomProgramBoundaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() publicationId!: string;
  @ApiProperty() publicationHash!: string;
  @ApiProperty() programDefinitionId!: string;
  @ApiProperty() definitionContentHash!: string;
  @ApiProperty() title!: string;
  @ApiProperty() doctorServiceId!: string;
  @ApiProperty({ type: CustomProgramPhysicianDto }) physician!: CustomProgramPhysicianDto;
  @ApiProperty() amountRial!: string;
  @ApiProperty({ enum: ['IRR'] }) currency!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty() sourceAvailable!: boolean;
  @ApiProperty({ type: ProgramTermsDto, nullable: true }) carePolicy!: ProgramTermsDto | null;
  @ApiProperty({ type: CustomProgramCareDto, nullable: true }) careAuthorization!: CustomProgramCareDto | null;
}
export class CustomProgramRequestPageDto {
  @ApiProperty({ type: [CustomProgramRequestDto] }) items!: CustomProgramRequestDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
export class CustomProgramCarePageDto {
  @ApiProperty({ type: [CustomProgramCareDto] }) items!: CustomProgramCareDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
