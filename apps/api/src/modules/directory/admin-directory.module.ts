import { Module } from '@nestjs/common';

import { AdminDirectoryController } from './admin-directory.controller';
import { AdminDirectoryService } from './admin-directory.service';
import { PatientDirectoryController } from './patient-directory.controller';
import { PatientDirectoryService } from './patient-directory.service';

@Module({ controllers: [AdminDirectoryController, PatientDirectoryController], providers: [AdminDirectoryService, PatientDirectoryService] })
export class AdminDirectoryModule {}
