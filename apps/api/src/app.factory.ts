import {
  ClassSerializerInterceptor,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import fastifyCookie from '@fastify/cookie';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { createFastifyLoggingOptions } from './common/logging/fastify-logging.config';

export async function createApiApplication(): Promise<NestFastifyApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(
      createFastifyLoggingOptions(process.env.LOG_LEVEL ?? 'info'),
    ),
  );
  const configService = app.get(ConfigService);
  const allowedOrigins = configService
    .getOrThrow<string>('APP_ORIGINS')
    .split(',');

  await app.register(fastifyCookie as never);
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.setGlobalPrefix('v1');
  const openApiConfig = new DocumentBuilder()
    .setTitle('Sabz Zendegi API')
    .setDescription('REST API for Sabz Zendegi clinic services.')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'bearerAuth',
    )
    .addCookieAuth(
      '__Host-sz_refresh',
      {
        type: 'apiKey',
        in: 'cookie',
        description:
          'HttpOnly refresh cookie. Local development uses sz_refresh_dev.',
      },
      'refreshCookie',
    )
    .build();
  const openApiDocument = SwaggerModule.createDocument(app, openApiConfig);

  SwaggerModule.setup('docs', app, openApiDocument, {
    jsonDocumentUrl: 'docs-json',
    swaggerOptions: { persistAuthorization: true },
    useGlobalPrefix: false,
  });
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

  return app;
}
