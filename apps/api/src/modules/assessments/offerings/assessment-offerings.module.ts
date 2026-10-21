import { Module } from '@nestjs/common';
import { AssessmentOfferingsController } from './assessment-offerings.controller';
import { AssessmentOfferingsService } from './assessment-offerings.service';
@Module({ controllers: [AssessmentOfferingsController], providers: [AssessmentOfferingsService], exports: [AssessmentOfferingsService] })
export class AssessmentOfferingsModule {}
