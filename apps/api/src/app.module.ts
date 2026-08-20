import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'node:path';

import { HealthController } from './common/health/health.controller';
import { environmentValidationSchema } from './config/environment.validation';
import { DatabaseModule } from './database/database.module';

@Module({
  controllers: [HealthController],
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
    DatabaseModule,
  ],
})
export class AppModule {}
