import { Module } from '@nestjs/common';
import { BillingModule } from '../../billing/billing.module';
import { IdentityModule } from '../identity.module';
import { BaleWebhookController } from './bale-auth.controller';

/**
 * Same webhook URL for phone and wallet updates. Kept outside IdentityModule to
 * avoid a circular IdentityModule <-> BillingModule dependency.
 */
@Module({ imports: [IdentityModule, BillingModule], controllers: [BaleWebhookController] })
export class BaleWebhookModule {}
