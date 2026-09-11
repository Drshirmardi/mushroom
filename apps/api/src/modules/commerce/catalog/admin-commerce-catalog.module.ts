import { Module } from '@nestjs/common';
import { AdminCommerceCatalogController } from './admin-commerce-catalog.controller';
import { AdminCommerceCatalogService } from './admin-commerce-catalog.service';
import { PatientCommerceCatalogController } from './patient-commerce-catalog.controller';
import { PatientCommerceCatalogService } from './patient-commerce-catalog.service';
import { PatientCommerceCartController } from '../cart/patient-commerce-cart.controller';
import { PatientCommerceCartService } from '../cart/patient-commerce-cart.service';
import { AdminCommerceShippingController } from '../checkout/admin-commerce-shipping.controller';
import { PatientCommerceCheckoutController, PatientCommerceOrdersController } from '../checkout/patient-commerce-checkout.controller';
import { CommerceCheckoutService } from '../checkout/commerce-checkout.service';
import { CommerceClock } from '../inventory/commerce-clock';
import { CommerceInventoryService } from '../inventory/commerce-inventory.service';
import { InventoryReservationExpiryWorker } from '../inventory/inventory-reservation-expiry.worker';
@Module({ controllers: [AdminCommerceCatalogController, PatientCommerceCatalogController, PatientCommerceCartController, AdminCommerceShippingController, PatientCommerceCheckoutController, PatientCommerceOrdersController], providers: [AdminCommerceCatalogService, PatientCommerceCatalogService, PatientCommerceCartService, CommerceClock, CommerceInventoryService, InventoryReservationExpiryWorker, CommerceCheckoutService], exports: [CommerceInventoryService] })
export class AdminCommerceCatalogModule {}
