import { Module } from '@nestjs/common';
import { GuidanceContentModule } from '../../content/guidance/guidance-content.module';
import { IdentityModule } from '../../identity/identity.module';
import { ProgramDefinitionModule } from '../definitions/program-definition.module';
import { ProgramCatalogBundle } from './program-catalog.bundle';
import { ProgramCatalogService } from './program-catalog.service';
import { ProgramServicesService } from './program-services.service';
import { AdminProgramCatalogController, AdminProgramCategoriesController, AdminProgramServicesController } from './program-services.controller';

@Module({ imports: [GuidanceContentModule, IdentityModule, ProgramDefinitionModule], controllers: [AdminProgramCatalogController, AdminProgramCategoriesController, AdminProgramServicesController], providers: [ProgramCatalogBundle, ProgramCatalogService, ProgramServicesService] })
export class ProgramCatalogModule {}
