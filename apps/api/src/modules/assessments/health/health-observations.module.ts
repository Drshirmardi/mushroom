import { Module } from '@nestjs/common';
import { ClinicalModule } from '../../clinical/clinical.module';
import { HealthObservationsController } from './health-observations.controller';
import { HealthObservationsService } from './health-observations.service';
@Module({ imports: [ClinicalModule], controllers: [HealthObservationsController], providers: [HealthObservationsService] })
export class HealthObservationsModule {}
