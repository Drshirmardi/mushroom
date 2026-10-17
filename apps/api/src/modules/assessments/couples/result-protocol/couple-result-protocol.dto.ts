import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, Equals, IsArray, IsBoolean, IsString, IsUUID, Length, ValidateNested } from 'class-validator';
import { AssessmentGuidanceQueryDto, AssessmentGuidanceReferenceDto } from '../../guidance/assessment-guidance.dto';
import { GuidanceApprovalDto } from '../../../content/guidance/guidance-content.dto';

export class CoupleResultPairDto {
  @ApiProperty() @IsString() @Length(1, 100) firstBandId!: string;
  @ApiProperty() @IsString() @Length(1, 100) secondBandId!: string;
  @ApiProperty({ type: [String], format: 'uuid' }) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(5) @ArrayUnique() @IsUUID('4', { each: true }) guidanceContentIds!: string[];
  @ApiProperty() @IsBoolean() recommendConsultation!: boolean;
}
export class CoupleResultProtocolCreateDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') assessmentVersionId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') protocolReviewId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') disclosurePolicyVersionId!: string;
  @ApiProperty({ type: [CoupleResultPairDto] }) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(528) @ValidateNested({ each: true }) @Type(() => CoupleResultPairDto) pairs!: CoupleResultPairDto[];
}
export class CoupleResultProtocolApprovalDto extends GuidanceApprovalDto {
  @ApiProperty({ enum: [true] }) @Equals(true) reviewedJointDisclosure!: true;
}
export class CoupleResultProtocolQueryDto extends AssessmentGuidanceQueryDto {}
export class CoupleResultProtocolDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) assessmentVersionId!: string;
  @ApiProperty({ format: 'uuid' }) protocolReviewId!: string;
  @ApiProperty({ format: 'uuid' }) disclosurePolicyVersionId!: string;
  @ApiProperty() disclosureContentHash!: string;
  @ApiProperty() questionnaireContentHash!: string;
  @ApiProperty() versionNumber!: number;
  @ApiProperty({ enum: ['APPROVED_PAIR_LOOKUP'] }) algorithmId!: string;
  @ApiProperty({ enum: [1] }) algorithmVersion!: number;
  @ApiProperty({ type: [CoupleResultPairDto] }) pairs!: CoupleResultPairDto[];
  @ApiProperty({ type: [AssessmentGuidanceReferenceDto] }) contentReferences!: AssessmentGuidanceReferenceDto[];
  @ApiProperty() contentHash!: string;
  @ApiProperty({ enum: ['DRAFT', 'APPROVED', 'REVOKED'] }) status!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) approvedAt!: Date | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) revokedAt!: Date | null;
  @ApiProperty() usable!: boolean;
  @ApiProperty({ type: [String] }) blockers!: string[];
}
export class CoupleResultProtocolPageDto {
  @ApiProperty({ type: [CoupleResultProtocolDto] }) items!: CoupleResultProtocolDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
