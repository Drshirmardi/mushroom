import { Module } from '@nestjs/common';
import { GuidanceContentModule } from '../../content/guidance/guidance-content.module';
import { IdentityModule } from '../../identity/identity.module';
import { ProgramDefinitionModule } from '../definitions/program-definition.module';
import { CustomProgramController } from './custom-program.controller';
import { CustomProgramService } from './custom-program.service';
@Module({ imports: [GuidanceContentModule, IdentityModule, ProgramDefinitionModule], controllers: [CustomProgramController], providers: [CustomProgramService] })
export class CustomProgramModule {}
