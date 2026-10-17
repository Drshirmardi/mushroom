import { Module } from '@nestjs/common';
import { GuidanceContentModule } from '../../content/guidance/guidance-content.module';
import { IdentityModule } from '../../identity/identity.module';
import { AdminProgramDefinitionController, ClinicalProgramDefinitionController, ProgramDefinitionRateGuard } from './program-definition.controller';
import { ProgramDefinitionService } from './program-definition.service';
@Module({ imports: [GuidanceContentModule, IdentityModule], controllers: [AdminProgramDefinitionController, ClinicalProgramDefinitionController], providers: [ProgramDefinitionService, ProgramDefinitionRateGuard], exports: [ProgramDefinitionService] })
export class ProgramDefinitionModule {}
