import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class PatientBookingEligibilityResponseDto { @ApiProperty() eligible!: boolean; @ApiProperty({ enum: ['ELIGIBLE', 'PROFILE_INCOMPLETE', 'MAIN_ASSESSMENT_REQUIRED', 'ASSESSMENT_EXPIRED', 'LATEST_VERSION_REQUIRED'] }) reason!: string; @ApiPropertyOptional({ type: String, nullable: true }) nextAction!: string | null; }
