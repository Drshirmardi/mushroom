import { Module } from '@nestjs/common';

import { IntakeController } from './presentation/http/intake.controller';
import { PatientIntakeService } from './patient-intake.service';

@Module({
  controllers: [IntakeController],
  providers: [PatientIntakeService],
})
export class IntakeModule {}
