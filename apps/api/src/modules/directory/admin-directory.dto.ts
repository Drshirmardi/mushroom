import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUrl, IsUUID, Max, MaxLength, Min } from 'class-validator';

const publicationStatuses = ['UNPUBLISHED', 'PUBLISHED'] as const;
const visitModes = ['IN_PERSON', 'ONLINE'] as const;

export class DirectoryListQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160)
  query?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Boolean) @IsBoolean()
  isActive?: boolean;
  @ApiPropertyOptional({ enum: publicationStatuses }) @IsOptional() @IsIn(publicationStatuses)
  publicationStatus?: (typeof publicationStatuses)[number];
  @ApiPropertyOptional({ type: 'integer', minimum: 1, maximum: 10_000, default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10_000)
  page = 1;
  @ApiPropertyOptional({ type: 'integer', minimum: 1, maximum: 50, default: 20 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50)
  pageSize = 20;
}

export class DoctorListQueryDto extends DirectoryListQueryDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4')
  specialtyId?: string;
}

export class DoctorServiceListQueryDto extends DirectoryListQueryDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4') doctorId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4') serviceId?: string;
  @ApiPropertyOptional({ enum: visitModes }) @IsOptional() @IsIn(visitModes) visitMode?: (typeof visitModes)[number];
}

export class UpdateClinicDto {
  @ApiPropertyOptional({ maxLength: 160 }) @IsOptional() @IsString() @MaxLength(160)
  name?: string;
  @ApiPropertyOptional({ example: 'Asia/Tehran', maxLength: 64 }) @IsOptional() @IsString() @MaxLength(64)
  timeZone?: string;
}

class DirectoryRecordFieldsDto {
  @ApiProperty({ maxLength: 160 }) @IsString() @MaxLength(160)
  name!: string;
  @ApiPropertyOptional({ nullable: true, maxLength: 1000 }) @IsOptional() @IsString() @MaxLength(1000)
  description?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  isActive?: boolean;
  @ApiPropertyOptional({ enum: publicationStatuses }) @IsOptional() @IsIn(publicationStatuses)
  publicationStatus?: (typeof publicationStatuses)[number];
}

export class CreateSpecialtyDto extends DirectoryRecordFieldsDto {}
export class CreateServiceDto extends DirectoryRecordFieldsDto {}

export class UpdateSpecialtyDto {
  @ApiPropertyOptional({ maxLength: 160 }) @IsOptional() @IsString() @MaxLength(160) name?: string;
  @ApiPropertyOptional({ nullable: true, maxLength: 1000 }) @IsOptional() @IsString() @MaxLength(1000) description?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional({ enum: publicationStatuses }) @IsOptional() @IsIn(publicationStatuses) publicationStatus?: (typeof publicationStatuses)[number];
}
export class UpdateServiceDto extends UpdateSpecialtyDto {}

export class CreateDoctorDto {
  @ApiProperty({ maxLength: 160 }) @IsString() @MaxLength(160)
  displayName!: string;
  @ApiPropertyOptional({ nullable: true, maxLength: 3000 }) @IsOptional() @IsString() @MaxLength(3000)
  biography?: string | null;
  @ApiPropertyOptional({ nullable: true, minimum: 0, maximum: 80 }) @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(80)
  yearsExperience?: number | null;
  @ApiPropertyOptional({ nullable: true, maxLength: 2048 }) @IsOptional() @IsUrl({ protocols: ['https'], require_protocol: true }) @MaxLength(2048)
  profileImageUrl?: string | null;
  @ApiPropertyOptional({ type: [String], maxItems: 10 }) @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) @MaxLength(80, { each: true })
  languages?: string[];
  @ApiPropertyOptional({ type: [String], maxItems: 20 }) @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(240, { each: true })
  education?: string[];
  @ApiPropertyOptional({ type: [String], maxItems: 20 }) @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(240, { each: true })
  certifications?: string[];
  @ApiPropertyOptional({ type: [String], format: 'uuid', maxItems: 10 }) @IsOptional() @IsArray() @ArrayMaxSize(10) @IsUUID('4', { each: true })
  specialtyIds?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  isActive?: boolean;
  @ApiPropertyOptional({ enum: publicationStatuses }) @IsOptional() @IsIn(publicationStatuses)
  publicationStatus?: (typeof publicationStatuses)[number];
}

export class UpdateDoctorDto {
  @ApiPropertyOptional({ maxLength: 160 }) @IsOptional() @IsString() @MaxLength(160) displayName?: string;
  @ApiPropertyOptional({ nullable: true, maxLength: 3000 }) @IsOptional() @IsString() @MaxLength(3000) biography?: string | null;
  @ApiPropertyOptional({ nullable: true, minimum: 0, maximum: 80 }) @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(80) yearsExperience?: number | null;
  @ApiPropertyOptional({ nullable: true, maxLength: 2048 }) @IsOptional() @IsUrl({ protocols: ['https'], require_protocol: true }) @MaxLength(2048) profileImageUrl?: string | null;
  @ApiPropertyOptional({ type: [String], maxItems: 10 }) @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) @MaxLength(80, { each: true }) languages?: string[];
  @ApiPropertyOptional({ type: [String], maxItems: 20 }) @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(240, { each: true }) education?: string[];
  @ApiPropertyOptional({ type: [String], maxItems: 20 }) @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(240, { each: true }) certifications?: string[];
  @ApiPropertyOptional({ type: [String], format: 'uuid', maxItems: 10 }) @IsOptional() @IsArray() @ArrayMaxSize(10) @IsUUID('4', { each: true }) specialtyIds?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional({ enum: publicationStatuses }) @IsOptional() @IsIn(publicationStatuses) publicationStatus?: (typeof publicationStatuses)[number];
}

export class CreateDoctorServiceDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') doctorId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') serviceId!: string;
  @ApiProperty({ enum: visitModes }) @IsOptional() visitMode!: (typeof visitModes)[number];
  @ApiProperty({ minimum: 5, maximum: 480 }) @IsOptional() @Type(() => Number) durationMinutes!: number;
  @ApiPropertyOptional({ minimum: 0, maximum: 240, default: 0 }) @IsOptional() @Type(() => Number) bufferMinutes?: number;
  @ApiProperty({ minimum: 0, maximum: 2_147_483_647 }) @IsOptional() @Type(() => Number) priceAmount!: number;
  @ApiPropertyOptional({ enum: ['IRR'], default: 'IRR' }) @IsOptional() currency?: 'IRR';
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional({ enum: publicationStatuses }) @IsOptional() @IsIn(publicationStatuses) publicationStatus?: (typeof publicationStatuses)[number];
}

export class UpdateDoctorServiceDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4') doctorId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4') serviceId?: string;
  @ApiPropertyOptional({ enum: visitModes }) @IsOptional() visitMode?: (typeof visitModes)[number];
  @ApiPropertyOptional({ minimum: 5, maximum: 480 }) @IsOptional() @Type(() => Number) durationMinutes?: number;
  @ApiPropertyOptional({ minimum: 0, maximum: 240 }) @IsOptional() @Type(() => Number) bufferMinutes?: number;
  @ApiPropertyOptional({ minimum: 0, maximum: 2_147_483_647 }) @IsOptional() @Type(() => Number) priceAmount?: number;
  @ApiPropertyOptional({ enum: ['IRR'] }) @IsOptional() currency?: 'IRR';
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional({ enum: publicationStatuses }) @IsOptional() @IsIn(publicationStatuses) publicationStatus?: (typeof publicationStatuses)[number];
}

export class ClinicResponseDto { @ApiProperty({ format: 'uuid' }) id!: string; @ApiProperty() name!: string; @ApiProperty() timeZone!: string; @ApiProperty({ enum: ['ACTIVE', 'INACTIVE'] }) status!: string; @ApiProperty({ format: 'date-time' }) createdAt!: Date; @ApiProperty({ format: 'date-time' }) updatedAt!: Date; }
export class SpecialtyResponseDto { @ApiProperty({ format: 'uuid' }) id!: string; @ApiProperty() name!: string; @ApiPropertyOptional({ nullable: true }) description!: string | null; @ApiProperty() isActive!: boolean; @ApiProperty({ enum: publicationStatuses }) publicationStatus!: string; @ApiPropertyOptional({ nullable: true, format: 'date-time' }) publishedAt!: Date | null; @ApiProperty({ format: 'date-time' }) createdAt!: Date; @ApiProperty({ format: 'date-time' }) updatedAt!: Date; }
export class ServiceResponseDto extends SpecialtyResponseDto {}
export class DoctorSpecialtyResponseDto { @ApiProperty({ format: 'uuid' }) id!: string; @ApiProperty() name!: string; }
export class DoctorResponseDto { @ApiProperty({ format: 'uuid' }) id!: string; @ApiPropertyOptional({ nullable: true, format: 'uuid' }) userId!: string | null; @ApiProperty() displayName!: string; @ApiPropertyOptional({ nullable: true }) biography!: string | null; @ApiPropertyOptional({ nullable: true }) yearsExperience!: number | null; @ApiPropertyOptional({ nullable: true }) profileImageUrl!: string | null; @ApiProperty({ type: [String] }) languages!: string[]; @ApiProperty({ type: [String] }) education!: string[]; @ApiProperty({ type: [String] }) certifications!: string[]; @ApiProperty({ type: DoctorSpecialtyResponseDto, isArray: true }) specialties!: DoctorSpecialtyResponseDto[]; @ApiProperty() isActive!: boolean; @ApiProperty({ enum: publicationStatuses }) publicationStatus!: string; @ApiPropertyOptional({ nullable: true, format: 'date-time' }) publishedAt!: Date | null; @ApiProperty({ format: 'date-time' }) createdAt!: Date; @ApiProperty({ format: 'date-time' }) updatedAt!: Date; }
export class DoctorServiceParentResponseDto { @ApiProperty({ format: 'uuid' }) id!: string; @ApiProperty() name!: string; }
export class DoctorServiceResponseDto { @ApiProperty({ format: 'uuid' }) id!: string; @ApiProperty({ type: DoctorServiceParentResponseDto }) doctor!: DoctorServiceParentResponseDto; @ApiProperty({ type: DoctorServiceParentResponseDto }) service!: DoctorServiceParentResponseDto; @ApiProperty({ enum: visitModes }) visitMode!: string; @ApiProperty() durationMinutes!: number; @ApiProperty() bufferMinutes!: number; @ApiProperty() priceAmount!: number; @ApiProperty({ enum: ['IRR'] }) currency!: string; @ApiProperty() isActive!: boolean; @ApiProperty({ enum: publicationStatuses }) publicationStatus!: string; @ApiPropertyOptional({ nullable: true, format: 'date-time' }) publishedAt!: Date | null; @ApiProperty({ format: 'date-time' }) createdAt!: Date; @ApiProperty({ format: 'date-time' }) updatedAt!: Date; }
export class DirectoryPageResponseDto { @ApiProperty({ type: SpecialtyResponseDto, isArray: true }) items!: SpecialtyResponseDto[]; @ApiProperty() page!: number; @ApiProperty() pageSize!: number; @ApiProperty() total!: number; }
export class DoctorPageResponseDto { @ApiProperty({ type: DoctorResponseDto, isArray: true }) items!: DoctorResponseDto[]; @ApiProperty() page!: number; @ApiProperty() pageSize!: number; @ApiProperty() total!: number; }
export class DoctorServicePageResponseDto { @ApiProperty({ type: DoctorServiceResponseDto, isArray: true }) items!: DoctorServiceResponseDto[]; @ApiProperty() page!: number; @ApiProperty() pageSize!: number; @ApiProperty() total!: number; }
