import { Module } from '@nestjs/common';

import { AdminPatientsController } from './admin-patients.controller';
import { AdminPatientsService } from './admin-patients.service';

@Module({
  controllers: [AdminPatientsController],
  providers: [AdminPatientsService],
})
export class AdminPatientsModule {}
