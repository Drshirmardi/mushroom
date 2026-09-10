import { Module } from '@nestjs/common';
import { AdminCommerceCatalogController } from './admin-commerce-catalog.controller';
import { AdminCommerceCatalogService } from './admin-commerce-catalog.service';
@Module({ controllers: [AdminCommerceCatalogController], providers: [AdminCommerceCatalogService] })
export class AdminCommerceCatalogModule {}
