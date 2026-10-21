import { Module } from '@nestjs/common';
import { ProductImageStorage, R2ProductImageStorage } from './product-image-storage';

@Module({ providers: [{ provide: ProductImageStorage, useClass: R2ProductImageStorage }], exports: [ProductImageStorage] })
export class ProductImageStorageModule {}
