import 'reflect-metadata';

import {
  ClassSerializerInterceptor,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { createFastifyLoggingOptions } from './common/logging/fastify-logging.config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(
      createFastifyLoggingOptions(process.env.LOG_LEVEL ?? 'info'),
    ),
  );
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3003);

  app.setGlobalPrefix('v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      validateCustomDecorators: true,
      stopAtFirstError: true,
      disableErrorMessages: configService.get('NODE_ENV') === 'production',
    }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen({ port, host: '0.0.0.0' });
}

void bootstrap();
