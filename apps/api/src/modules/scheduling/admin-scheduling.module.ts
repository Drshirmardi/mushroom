import { Module } from '@nestjs/common';

import { AdminSchedulingController } from './admin-scheduling.controller';
import { AdminSchedulingService } from './admin-scheduling.service';

@Module({ controllers: [AdminSchedulingController], providers: [AdminSchedulingService] })
export class AdminSchedulingModule {}
