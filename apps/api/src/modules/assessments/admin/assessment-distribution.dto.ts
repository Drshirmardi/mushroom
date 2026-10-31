import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
export class AssessmentDistributionDto {
  @ApiProperty() @IsBoolean() publiclyAvailable!: boolean;
}
