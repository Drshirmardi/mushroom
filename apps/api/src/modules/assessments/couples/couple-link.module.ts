import { Module } from '@nestjs/common';
import { IdentityModule } from '../../identity/identity.module';
import { CoupleLinkController, CoupleLinkRateGuard } from './couple-link.controller';
import { CoupleLinkService } from './couple-link.service';
@Module({ imports: [IdentityModule], controllers: [CoupleLinkController], providers: [CoupleLinkService, CoupleLinkRateGuard], exports: [CoupleLinkRateGuard] })
export class CoupleLinkModule {}
