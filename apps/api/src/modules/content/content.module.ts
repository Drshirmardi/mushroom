import { Module } from '@nestjs/common';
import { ProductImageProcessor } from '../commerce/media/product-image-processor';
import { ProductImageStorageModule } from '../commerce/media/product-image-storage.module';
import { ContentController, PublicContentBannerController } from './content.controller';
import { ContentService } from './content.service';
import { BannerMediaService } from './banner-media.service';
import { OutboxModule } from '../outbox/outbox.module';
import { IdentityModule } from '../identity/identity.module';
@Module({ imports: [ProductImageStorageModule, OutboxModule, IdentityModule], controllers: [ContentController, PublicContentBannerController], providers: [ContentService, BannerMediaService, ProductImageProcessor] }) export class ContentModule {}
