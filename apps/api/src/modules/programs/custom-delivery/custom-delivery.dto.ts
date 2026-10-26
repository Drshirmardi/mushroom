import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Equals, IsDefined, IsIn, IsInt, IsUUID, Matches, Max, Min, ValidateNested } from 'class-validator';
import { CreateTreatmentPlanDto } from '../../clinical/treatment-plan.dto';
import { TreatmentPlanResponseDto } from '../../clinical/treatment-plan-response.dto';
import { IntakeSnapshotDto } from '../../patients/intake/presentation/http/dto/intake.dto';
export { CustomProgramQueryDto as CustomDeliveryQueryDto } from '../custom-requests/custom-program.dto';
export class CustomProgramBillingDto {
  @ApiProperty({ pattern: '^[a-f0-9]{64}$' }) @Matches(/^[a-f0-9]{64}$/u) publicationHash!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') termsConsentRecordId!: string;
}
export class CustomPlanCreateDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') careAuthorizationId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') sourceIntakeRevisionId!: string;
  @ApiProperty({ minimum: 0, maximum: 2147483646 }) @IsInt() @Min(0) @Max(2147483646) expectedVersionNumber!: number;
  @ApiProperty({ type: CreateTreatmentPlanDto }) @IsDefined() @ValidateNested() @Type(() => CreateTreatmentPlanDto) plan!: CreateTreatmentPlanDto;
}
export class CustomPlanIssueDto {
  @ApiProperty({ pattern: '^[a-f0-9]{64}$' }) @Matches(/^[a-f0-9]{64}$/u) contentHash!: string;
  @ApiProperty({ enum: [true] }) @Equals(true) reviewedPatientIntakeAndPlan!: true;
  @ApiProperty({ enum: [true] }) @Equals(true) noAutomatedTherapy!: true;
}
export class CustomPlanRevokeDto {
  @ApiProperty({ enum: ['SAFETY_REVIEW','CORRECTION','OTHER'] }) @IsIn(['SAFETY_REVIEW','CORRECTION','OTHER']) reason!: string;
}
export class CustomPlanVersionDto {
  @ApiProperty() id!: string;
  @ApiProperty() requestId!: string;
  @ApiProperty() versionNumber!: number;
  @ApiProperty() treatmentPlanId!: string;
  @ApiProperty() contentHash!: string;
  @ApiProperty({ enum: ['DRAFT','ISSUED','REVOKED'] }) status!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) issuedAt!: Date | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) revokedAt!: Date | null;
  @ApiProperty() current!: boolean;
  @ApiProperty() bodyAvailable!: boolean;
}
export class CustomPlanDetailDto extends CustomPlanVersionDto {
  @ApiProperty({ type: TreatmentPlanResponseDto, nullable: true }) plan!: TreatmentPlanResponseDto | null;
}
export class CustomPlanVersionPageDto {
  @ApiProperty({ type: [CustomPlanVersionDto] }) items!: CustomPlanVersionDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
export class CustomDeliveryStateDto {
  @ApiProperty() requestId!: string;
  @ApiProperty() entitled!: boolean;
  @ApiProperty({ enum: ['UNPAID','AWAITING_CARE','AWAITING_INTAKE','PROFESSIONAL_UNAVAILABLE','IN_PREPARATION','DELIVERED','CLINICALLY_REVOKED'] }) deliveryState!: string;
  @ApiProperty({ type: [String] }) blockers!: string[];
  @ApiProperty({ type: CustomPlanVersionDto, nullable: true }) currentVersion!: CustomPlanVersionDto | null;
  @ApiProperty({ type: [CustomPlanVersionDto] }) items!: CustomPlanVersionDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
export class CustomIntakeContextDto {
  @ApiProperty() id!: string;
  @ApiProperty() revisionNumber!: number;
  @ApiProperty({ enum: ['PATIENT_SELF_REPORTED'] }) dataOrigin!: string;
  @ApiProperty({ format: 'date-time' }) completedAt!: Date;
  @ApiProperty({ type: IntakeSnapshotDto }) snapshot!: IntakeSnapshotDto;
}
export class CustomClinicalRequestDto {
  @ApiProperty() id!: string;
  @ApiProperty() patientId!: string;
  @ApiProperty({ type: String, nullable: true }) patientDisplayName!: string | null;
  @ApiProperty() title!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
}
export class CustomClinicalRequestPageDto {
  @ApiProperty({ type: [CustomClinicalRequestDto] }) items!: CustomClinicalRequestDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
export class CustomClinicalContextDto extends CustomClinicalRequestDto {
  @ApiProperty() careAuthorizationId!: string;
  @ApiProperty({ type: CustomIntakeContextDto, nullable: true }) intake!: CustomIntakeContextDto | null;
  @ApiProperty() latestVersionNumber!: number;
  @ApiProperty() preparationAvailable!: boolean;
  @ApiProperty({ type: [String] }) blockers!: string[];
}
