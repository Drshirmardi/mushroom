import { Module } from '@nestjs/common';
import { GuidanceContentModule } from '../../content/guidance/guidance-content.module';
import { IdentityModule } from '../../identity/identity.module';
import { ProgramDefinitionModule } from '../definitions/program-definition.module';
import { ProgramPublicationModule } from '../publication/program-publication.module';
import { ProgramDraftPublicationService } from './program-draft-publication.service';
import { ProgramDraftPublicationController } from './program-services.controller';
import { ProgramCatalogBundle } from './program-catalog.bundle';
import { ProgramCatalogService } from './program-catalog.service';
import { ProgramServicesService } from './program-services.service';
import { AdminProgramCatalogController, AdminProgramCategoriesController, AdminProgramServicesController } from './program-services.controller';

@Module({ imports: [GuidanceContentModule, IdentityModule, ProgramDefinitionModule, ProgramPublicationModule], controllers: [AdminProgramCatalogController, AdminProgramCategoriesController, AdminProgramServicesController, ProgramDraftPublicationController], providers: [ProgramCatalogBundle, ProgramCatalogService, ProgramServicesService, ProgramDraftPublicationService] })
export class ProgramCatalogModule {}
