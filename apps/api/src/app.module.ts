import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'node:path';

import { environmentValidationSchema } from './config/environment.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      envFilePath: [
        resolve(process.cwd(), 'apps/api/.env'),
        resolve(process.cwd(), '.env'),
      ],
      isGlobal: true,
      validationSchema: environmentValidationSchema,
      validationOptions: {
        abortEarly: false,
        allowUnknown: true,
      },
    }),
  ],
})
export class AppModule {}
