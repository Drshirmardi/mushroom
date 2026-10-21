import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Equals, IsInt, IsOptional, IsUUID, Matches, Max, Min } from 'class-validator';
import { ProtocolConsentDto } from '../protocol/assessment-protocol.dto';
export class AssessmentCarePageQueryDto {
  @ApiProperty({ required: false, default: 1, minimum: 1 }) @Type(() => Number) @IsInt() @Min(1) @IsOptional() page = 1;
  @ApiProperty({ required: false, default: 20, minimum: 1, maximum: 50 }) @Type(() => Number) @IsInt() @Min(1) @Max(50) @IsOptional() pageSize = 20;
}
export class AssessmentCarePreviewQueryDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') submissionId!: string;
}
export class AssessmentCareAcceptDto extends AssessmentCarePreviewQueryDto {
  @ApiProperty({ pattern: '^[a-f0-9]{64}$' }) @Matches(/^[a-f0-9]{64}$/u) contextHash!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') processingConsentRecordId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') carePolicyVersionId!: string;
  @ApiProperty({ pattern: '^[a-f0-9]{64}$' }) @Matches(/^[a-f0-9]{64}$/u) carePolicyContentHash!: string;
  @ApiProperty({ enum: [true] }) @Equals(true) careSharingAccepted!: true;
}
export class AssessmentCareBandDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() riskLevel!: string;
  @ApiProperty({ enum: [false] }) requiresReview!: false;
}
export class AssessmentCareSummaryDto {
  @ApiProperty({ format: 'uuid' }) submissionId!: string;
  @ApiProperty({ format: 'uuid' }) assessmentVersionId!: string;
  @ApiProperty() title!: string;
  @ApiProperty() versionNumber!: number;
  @ApiProperty({ format: 'date-time' }) completedAt!: Date;
  @ApiProperty({ enum: ['WEIGHTED_SUM'] }) algorithmId!: string;
  @ApiProperty({ enum: [1] }) algorithmVersion!: number;
  @ApiProperty() questionnaireContentHash!: string;
  @ApiProperty({ type: AssessmentCareBandDto }) resultBand!: AssessmentCareBandDto;
  @ApiProperty({ enum: [true] }) educationalOnly!: true;
  @ApiProperty({ enum: [false] }) clinicalFact!: false;
}
export class AssessmentCarePreviewDto {
  @ApiProperty({ format: 'uuid' }) appointmentId!: string;
  @ApiProperty({ format: 'uuid' }) assignedDoctorId!: string;
  @ApiProperty() contextHash!: string;
  @ApiProperty({ type: AssessmentCareSummaryDto }) source!: AssessmentCareSummaryDto;
  @ApiProperty({ type: ProtocolConsentDto }) processingPolicy!: ProtocolConsentDto;
  @ApiProperty({ type: ProtocolConsentDto }) carePolicy!: ProtocolConsentDto;
}
export class AssessmentCareShareDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) appointmentId!: string;
  @ApiProperty({ format: 'uuid' }) assignedDoctorId!: string;
  @ApiProperty({ format: 'uuid' }) submissionId!: string;
  @ApiProperty() contextHash!: string;
  @ApiProperty({ format: 'date-time' }) acceptedAt!: Date;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) withdrawnAt!: Date | null;
  @ApiProperty() currentlyAvailable!: boolean;
}
export class AssessmentCareSharePageDto {
  @ApiProperty({ type: [AssessmentCareShareDto] }) items!: AssessmentCareShareDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
export class AssignedAssessmentSummaryDto extends AssessmentCareSummaryDto {
  @ApiProperty({ format: 'uuid' }) shareId!: string;
}
export class AssignedAssessmentContextDto {
  @ApiProperty({ format: 'uuid' }) appointmentId!: string;
  @ApiProperty({ format: 'uuid' }) patientId!: string;
  @ApiProperty({ type: [AssignedAssessmentSummaryDto] }) items!: AssignedAssessmentSummaryDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
