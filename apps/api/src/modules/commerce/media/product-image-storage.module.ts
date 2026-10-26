import { Module } from '@nestjs/common';
import { ProductImageStorage, S3ProductImageStorage } from './product-image-storage';

@Module({ providers: [{ provide: ProductImageStorage, useClass: S3ProductImageStorage }], exports: [ProductImageStorage] })
export class ProductImageStorageModule {}
