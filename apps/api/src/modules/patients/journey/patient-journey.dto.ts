import { ApiProperty } from '@nestjs/swagger';
import { PatientBookingEligibilityResponseDto } from '../../assessments/patient/patient-booking-eligibility.dto';

export const JOURNEY_ACTIONS = ['OPEN_APPOINTMENT', 'COMPLETE_PROFILE', 'CONSENT_UNAVAILABLE', 'REVIEW_CONSENT', 'START_MEDICAL_INTAKE', 'CONTINUE_MEDICAL_INTAKE', 'COMPLETE_ONBOARDING', 'REVIEW_BOOKING_REQUIREMENTS', 'RESUME_ASSESSMENT', 'CONTINUE_PAYMENT', 'VIEW_TREATMENT_PLAN', 'VIEW_ASSESSMENT_RESULT', 'BOOK_CONSULTATION'] as const;
export class JourneyActionDto {
  @ApiProperty({ enum: JOURNEY_ACTIONS }) code!: typeof JOURNEY_ACTIONS[number];
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) resourceId!: string | null;
}
export class JourneyOnboardingDto {
  @ApiProperty({ enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETE'] }) state!: string;
  @ApiProperty() isComplete!: boolean;
  @ApiProperty() requiredCount!: number;
  @ApiProperty() answeredRequiredCount!: number;
  @ApiProperty({ type: [String] }) missingFields!: string[];
  @ApiProperty({ type: [String] }) blockerCodes!: string[];
  @ApiProperty() nextAction!: string;
}
export class JourneyAssessmentDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) assessmentVersionId!: string;
  @ApiProperty() assessmentKey!: string;
  @ApiProperty() title!: string;
  @ApiProperty() versionNumber!: number;
  @ApiProperty({ enum: ['IN_PROGRESS', 'COMPLETE'] }) state!: string;
  @ApiProperty() revision!: number;
  @ApiProperty({ format: 'date-time' }) updatedAt!: Date;
  @ApiProperty() resumeAvailable!: boolean;
  @ApiProperty({ type: String, nullable: true, enum: ['VERSION_NOT_PUBLISHED'] }) resumeBlocker!: string | null;
}
export class JourneyAppointmentDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'date-time' }) startsAt!: Date;
  @ApiProperty({ format: 'date-time' }) endsAt!: Date;
  @ApiProperty() status!: string;
  @ApiProperty({ enum: ['ONLINE', 'IN_PERSON'] }) visitMode!: string;
}
export class JourneyPaymentDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() purpose!: string;
  @ApiProperty({ description: 'Integer rial amount, serialized without precision loss' }) amountRial!: string;
  @ApiProperty({ enum: ['IRR'] }) currency!: string;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) expiresAt!: Date | null;
}
export class JourneyOrderDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() totalAmountToman!: string;
  @ApiProperty({ enum: ['TOMAN'] }) currency!: string;
}
export class JourneyPlanDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: ['ACTIVE', 'COMPLETED'] }) state!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: Date;
}
export class JourneyAssessmentsDto {
  @ApiProperty({ type: [JourneyAssessmentDto], maxItems: 5 }) items!: JourneyAssessmentDto[];
  @ApiProperty() hasMore!: boolean;
}
export class JourneyAppointmentsDto {
  @ApiProperty({ type: [JourneyAppointmentDto], maxItems: 5 }) items!: JourneyAppointmentDto[];
  @ApiProperty() hasMore!: boolean;
}
export class JourneyPaymentsDto {
  @ApiProperty({ type: [JourneyPaymentDto], maxItems: 5 }) items!: JourneyPaymentDto[];
  @ApiProperty() hasMore!: boolean;
}
export class JourneyOrdersDto {
  @ApiProperty({ type: [JourneyOrderDto], maxItems: 5 }) items!: JourneyOrderDto[];
  @ApiProperty() hasMore!: boolean;
}
export class JourneyPlansDto {
  @ApiProperty({ type: [JourneyPlanDto], maxItems: 5 }) items!: JourneyPlanDto[];
  @ApiProperty() hasMore!: boolean;
}
export class PatientJourneyResponseDto {
  @ApiProperty({ format: 'date-time' }) evaluatedAt!: Date;
  @ApiProperty({ type: JourneyOnboardingDto }) onboarding!: JourneyOnboardingDto;
  @ApiProperty({ type: PatientBookingEligibilityResponseDto }) bookingEligibility!: PatientBookingEligibilityResponseDto;
  @ApiProperty({ type: JourneyActionDto }) nextAction!: JourneyActionDto;
  @ApiProperty({ type: JourneyAssessmentsDto }) assessments!: JourneyAssessmentsDto;
  @ApiProperty({ type: JourneyAppointmentsDto }) appointments!: JourneyAppointmentsDto;
  @ApiProperty({ type: JourneyPaymentsDto }) pendingPayments!: JourneyPaymentsDto;
  @ApiProperty({ type: JourneyOrdersDto }) pendingOrders!: JourneyOrdersDto;
  @ApiProperty({ type: JourneyPlansDto }) treatmentPlans!: JourneyPlansDto;
  @ApiProperty({ description: 'Shopping is independent of medical onboarding' }) storeAvailable!: boolean;
}
