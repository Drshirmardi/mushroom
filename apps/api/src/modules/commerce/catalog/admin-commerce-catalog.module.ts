import { Module } from '@nestjs/common';
import { AdminCommerceCatalogController } from './admin-commerce-catalog.controller';
import { AdminCommerceCatalogService } from './admin-commerce-catalog.service';
import { PatientCommerceCatalogController } from './patient-commerce-catalog.controller';
import { PatientCommerceCatalogService } from './patient-commerce-catalog.service';
import { PatientCommerceCartController } from '../cart/patient-commerce-cart.controller';
import { PatientCommerceCartService } from '../cart/patient-commerce-cart.service';
@Module({ controllers: [AdminCommerceCatalogController, PatientCommerceCatalogController, PatientCommerceCartController], providers: [AdminCommerceCatalogService, PatientCommerceCatalogService, PatientCommerceCartService] })
export class AdminCommerceCatalogModule {}
