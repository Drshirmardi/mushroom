import { Module } from '@nestjs/common';

import { AdminDirectoryController } from './admin-directory.controller';
import { AdminDirectoryService } from './admin-directory.service';
import { PatientDirectoryController } from './patient-directory.controller';
import { PatientDirectoryService } from './patient-directory.service';

import { AdminDoctorImageController, PatientDoctorImageController } from './doctor-image.controller';
import { DoctorImageService } from './doctor-image.service';
import { ProductImageStorageModule } from '../commerce/media/product-image-storage.module';
import { ProductImageProcessor } from '../commerce/media/product-image-processor';
import { OutboxModule } from '../outbox/outbox.module';

@Module({ imports: [ProductImageStorageModule, OutboxModule], controllers: [AdminDirectoryController, PatientDirectoryController, AdminDoctorImageController, PatientDoctorImageController], providers: [AdminDirectoryService, PatientDirectoryService, DoctorImageService, ProductImageProcessor] })
export class AdminDirectoryModule {}
