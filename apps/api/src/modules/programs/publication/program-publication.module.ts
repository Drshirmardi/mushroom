import { Module } from '@nestjs/common';
import { GuidanceContentModule } from '../../content/guidance/guidance-content.module';
import { IdentityModule } from '../../identity/identity.module';
import { ProgramDefinitionModule } from '../definitions/program-definition.module';
import { ProgramPublicationController } from './program-publication.controller';
import { ProgramPublicationService } from './program-publication.service';
@Module({ imports: [GuidanceContentModule, IdentityModule, ProgramDefinitionModule], controllers: [ProgramPublicationController], providers: [ProgramPublicationService], exports: [ProgramPublicationService] })
export class ProgramPublicationModule {}
