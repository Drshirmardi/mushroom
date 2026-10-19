import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsBoolean, IsIn, IsInt, IsString, IsUUID, Length, Max, Min, ValidateNested } from 'class-validator';
import { PatientCommerceProductDto } from '../catalog/patient-commerce-catalog.dto';

export const MEZAJ_CODES = ['damavi', 'safravi', 'balgami', 'sodavi'] as const;
export type MezajCode = typeof MEZAJ_CODES[number];
export class CommerceMezajPairDto {
  @ApiProperty({ enum: MEZAJ_CODES }) @IsIn(MEZAJ_CODES) primary!: MezajCode;
  @ApiProperty({ enum: MEZAJ_CODES }) @IsIn(MEZAJ_CODES) secondary!: MezajCode;
}
export class CommerceMezajSourceDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') assessmentVersionId!: string;
  @ApiProperty() @IsString() @Length(1, 100) resultBandId!: string;
}
export class SaveCommerceMezajDto {
  @ApiProperty({ minimum: 0 }) @IsInt() @Min(0) expectedRevision!: number;
  @ApiProperty() @IsBoolean() enabled!: boolean;
  @ApiProperty({ type: [String], format: 'uuid', maxItems: 20 }) @IsArray() @ArrayMaxSize(20) @ArrayUnique() @IsUUID('4', { each: true }) productIds!: string[];
  @ApiProperty({ type: [CommerceMezajSourceDto], maxItems: 50 }) @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => CommerceMezajSourceDto) sources!: CommerceMezajSourceDto[];
}
export class CommerceMezajProductRefDto { @ApiProperty() id!: string; @ApiProperty() title!: string; }
export class CommerceMezajSourceRefDto extends CommerceMezajSourceDto {
  @ApiProperty() versionTitle!: string; @ApiProperty() versionNumber!: number; @ApiProperty() bandTitle!: string;
}
export class CommerceMezajCollectionDto extends CommerceMezajPairDto {
  @ApiProperty() revision!: number;
  @ApiProperty() enabled!: boolean;
  @ApiProperty({ type: [CommerceMezajProductRefDto] }) products!: CommerceMezajProductRefDto[];
  @ApiProperty({ type: [CommerceMezajSourceRefDto] }) sources!: CommerceMezajSourceRefDto[];
}
export class CommerceMezajBandDto { @ApiProperty() id!: string; @ApiProperty() title!: string; }
export class CommerceMezajVersionDto {
  @ApiProperty() id!: string; @ApiProperty() title!: string; @ApiProperty() versionNumber!: number;
  @ApiProperty() locale!: string; @ApiProperty() status!: string;
  @ApiProperty({ type: [CommerceMezajBandDto] }) resultBands!: CommerceMezajBandDto[];
}
export class CommerceMezajVersionQueryDto {
  @ApiPropertyOptional({ type: Number, default: 1 }) @Type(() => Number) @IsInt() @Min(1) @Max(10000) page = 1;
}
export class CommerceMezajVersionPageDto {
  @ApiProperty({ type: [CommerceMezajVersionDto] }) items!: CommerceMezajVersionDto[];
  @ApiProperty() page!: number; @ApiProperty() pageSize!: number; @ApiProperty() total!: number;
}
export const MEZAJ_STORE_STATUSES = ['READY', 'NO_RESULT', 'RESULT_UNSUPPORTED', 'REVIEW_REQUIRED', 'NOT_CONFIGURED', 'NO_PRODUCTS'] as const;
export class PatientCommerceRecommendationsDto {
  @ApiProperty({ enum: MEZAJ_STORE_STATUSES }) status!: typeof MEZAJ_STORE_STATUSES[number];
  @ApiProperty({ type: String, enum: MEZAJ_CODES, nullable: true }) primary!: MezajCode | null;
  @ApiProperty({ type: String, enum: MEZAJ_CODES, nullable: true }) secondary!: MezajCode | null;
  @ApiProperty({ type: [PatientCommerceProductDto] }) items!: PatientCommerceProductDto[];
}
