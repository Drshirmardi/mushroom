import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, Equals, IsArray, IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, Length, Matches, Max, Min, ValidateNested } from 'class-validator';
import { GuidanceSafetyDto } from '../../content/guidance/guidance-content.dto';
export const PROGRAM_KINDS = ['READY_EDUCATION', 'CUSTOM_PROFESSIONAL_PLAN'] as const;
export class ProgramContentReferenceDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') id!: string;
  @ApiProperty({ pattern: '^[a-f0-9]{64}$' }) @Matches(/^[a-f0-9]{64}$/u) contentHash!: string;
}
export class ProgramDefinitionCreateDto {
  @ApiProperty() @Matches(/^[A-Z][A-Z0-9_]{2,99}$/u) programKey!: string;
  @ApiProperty() @Matches(/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,3}$/u) locale!: string;
  @ApiProperty({ enum: PROGRAM_KINDS }) @IsIn(PROGRAM_KINDS) kind!: typeof PROGRAM_KINDS[number];
  @ApiProperty() @IsString() @Length(1, 240) @Matches(/\S/u) title!: string;
  @ApiProperty() @IsString() @Length(1, 2000) @Matches(/\S/u) summary!: string;
  @ApiProperty() @IsString() @Length(1, 100) @Matches(/\S/u) category!: string;
  @ApiProperty({ description: 'Exact plain educational curriculum or professional service specification; never execute as HTML.' }) @IsString() @Length(1, 100000) @Matches(/\S/u) body!: string;
  @ApiProperty() @IsString() @Length(1, 4000) @Matches(/\S/u) eligibilityDescription!: string;
  @ApiProperty({ type: GuidanceSafetyDto }) @IsObject() @ValidateNested() @Type(() => GuidanceSafetyDto) safety!: GuidanceSafetyDto;
  @ApiProperty({ type: [ProgramContentReferenceDto] }) @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => ProgramContentReferenceDto) contentReferences!: ProgramContentReferenceDto[];
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4') doctorServiceId?: string;
}
export class ProgramDefinitionApprovalDto {
  @ApiProperty({ pattern: '^[a-f0-9]{64}$' }) @Matches(/^[a-f0-9]{64}$/u) contentHash!: string;
  @ApiProperty({ enum: [true] }) @Equals(true) reviewedProgramAndSafety!: true;
  @ApiProperty({ enum: [true] }) @Equals(true) noAutomaticTherapyActivation!: true;
}
export class ProgramDefinitionQueryDto {
  @ApiPropertyOptional({ type: Number, default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) page = 1;
  @ApiPropertyOptional({ type: Number, default: 20 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) pageSize = 20;
  @ApiPropertyOptional() @IsOptional() @Matches(/^[A-Z][A-Z0-9_]{2,99}$/u) programKey?: string;
  @ApiPropertyOptional({ enum: ['DRAFT', 'APPROVED', 'REVOKED'] }) @IsOptional() @IsIn(['DRAFT', 'APPROVED', 'REVOKED']) status?: string;
}
export class ProgramServiceSnapshotDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) doctorId!: string;
  @ApiProperty({ format: 'uuid' }) serviceId!: string;
  @ApiProperty({ enum: ['ONLINE', 'IN_PERSON'] }) visitMode!: string;
  @ApiProperty() durationMinutes!: number;
}
export class ProgramDefinitionResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() programKey!: string;
  @ApiProperty() locale!: string;
  @ApiProperty() versionNumber!: number;
  @ApiProperty({ enum: PROGRAM_KINDS }) kind!: string;
  @ApiProperty() title!: string;
  @ApiProperty() summary!: string;
  @ApiProperty() category!: string;
  @ApiProperty() body!: string;
  @ApiProperty() eligibilityDescription!: string;
  @ApiProperty({ type: GuidanceSafetyDto }) safety!: GuidanceSafetyDto;
  @ApiProperty({ type: [ProgramContentReferenceDto] }) contentReferences!: ProgramContentReferenceDto[];
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) doctorServiceId!: string | null;
  @ApiProperty({ type: ProgramServiceSnapshotDto, nullable: true }) serviceSnapshot!: ProgramServiceSnapshotDto | null;
  @ApiProperty() contentHash!: string;
  @ApiProperty({ enum: ['DRAFT', 'APPROVED', 'REVOKED'] }) status!: string;
  @ApiProperty() dependenciesReady!: boolean;
  @ApiProperty() usable!: boolean;
  @ApiProperty({ enum: [false] }) commercialReady!: false;
  @ApiProperty() educationalOnly!: boolean;
  @ApiProperty() professionalReviewRequired!: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) approvedAt!: Date | null;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) revokedAt!: Date | null;
}
export class ProgramDefinitionPageDto {
  @ApiProperty({ type: [ProgramDefinitionResponseDto] }) items!: ProgramDefinitionResponseDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
}
