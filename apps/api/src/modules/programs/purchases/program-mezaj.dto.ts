import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayUnique, IsArray, IsBoolean, IsIn, IsInt, Matches, Max, Min } from 'class-validator';
import { MEZAJ_PAIR_CODES } from '../../assessments/domain/mezaj-recommendation-source';
export const PROGRAM_ICONS = ['book', 'compass', 'leaf', 'sparkles', 'heart'] as const;
export class SaveProgramMezajDto {
  @ApiProperty({ minimum: 0 }) @IsInt() @Min(0) @Max(2147483646) expectedRevision!: number;
  @ApiProperty() @IsBoolean() enabled!: boolean;
  @ApiProperty({ enum: PROGRAM_ICONS }) @IsIn(PROGRAM_ICONS) icon!: typeof PROGRAM_ICONS[number];
  @ApiProperty({ type: [String], maxItems: 16 }) @IsArray() @ArrayMaxSize(16) @ArrayUnique() @Matches(/^(damavi|safravi|balgami|sodavi)\/(damavi|safravi|balgami|sodavi)$/, { each: true }) pairs!: string[];
}
export class ProgramMezajDto {
  @ApiProperty() programDefinitionId!: string;
  @ApiProperty() revision!: number;
  @ApiProperty() enabled!: boolean;
  @ApiProperty({ enum: PROGRAM_ICONS }) icon!: string;
  @ApiProperty({ type: [String] }) pairs!: string[];
}
export class MezajProgramCardDto {
  @ApiProperty() baseAmountRial!: string;
  @ApiProperty() discountPercent!: number;
  @ApiProperty() serviceId!: string;
  @ApiProperty() programDefinitionId!: string;
  @ApiProperty() publicationId!: string;
  @ApiProperty() title!: string;
  @ApiProperty() summary!: string;
  @ApiProperty({ enum: PROGRAM_ICONS }) icon!: string;
  @ApiProperty() amountRial!: string;
  @ApiProperty({ enum: ['IRR'] }) currency!: 'IRR';
  @ApiProperty({ enum: ['BUY', 'PENDING', 'OWNED'] }) state!: 'BUY' | 'PENDING' | 'OWNED';
  @ApiProperty({ type: String, nullable: true }) accessGrantId!: string | null;
  @ApiProperty({ type: String, nullable: true }) purchaseId!: string | null;
}
export class MezajProgramRecommendationsDto {
  @ApiProperty({ enum: ['READY', 'NO_RESULT', 'RESULT_UNSUPPORTED', 'REVIEW_REQUIRED', 'NOT_CONFIGURED'] }) status!: string;
  @ApiProperty({ type: String, enum: MEZAJ_PAIR_CODES, nullable: true }) primary!: string | null;
  @ApiProperty({ type: String, enum: MEZAJ_PAIR_CODES, nullable: true }) secondary!: string | null;
  @ApiProperty({ type: String, nullable: true }) submissionId!: string | null;
  @ApiProperty({ type: [MezajProgramCardDto] }) items!: MezajProgramCardDto[];
}
export class OwnedProgramCardDto {
  @ApiProperty({ type: String, nullable: true }) serviceId!: string | null;
  @ApiProperty() accessGrantId!: string;
  @ApiProperty() purchaseId!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ enum: PROGRAM_ICONS }) icon!: string;
  @ApiProperty() accessAvailable!: boolean;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) endsAt!: Date | null;
}
export class OwnedProgramPageDto {
  @ApiProperty({ type: [OwnedProgramCardDto] }) items!: OwnedProgramCardDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
