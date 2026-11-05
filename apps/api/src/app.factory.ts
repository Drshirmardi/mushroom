import {
  ClassSerializerInterceptor,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import fastifyCookie from '@fastify/cookie';
import fastifyMultipart from '@fastify/multipart';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { OpenAPIObject } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { createFastifyLoggingOptions } from './common/logging/fastify-logging.config';

export const SWAGGER_UI_OPTIONS = Object.freeze({
  persistAuthorization: false,
});

function normalizeOpenApiParameterOrder(document: OpenAPIObject): OpenAPIObject {
  for (const pathItem of Object.values(document.paths)) {
    for (const operation of Object.values(pathItem ?? {})) {
      if (!operation || typeof operation !== 'object' || !('parameters' in operation)) {
        continue;
      }

      const parameters = operation.parameters;
      if (!Array.isArray(parameters)) continue;

      parameters.sort((left, right) => {
        const leftKey = `${left.in}:${left.name}`;
        const rightKey = `${right.in}:${right.name}`;
        return leftKey.localeCompare(rightKey);
      });
    }
  }

  return document;
}

export async function createApiApplication(): Promise<NestFastifyApplication> {
  const trustedProxies = (process.env.TRUSTED_PROXIES ?? '')
    .split(',')
    .map((proxy) => proxy.trim())
    .filter((proxy) => proxy.length > 0);
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(
      {
        ...createFastifyLoggingOptions(process.env.LOG_LEVEL ?? 'info'),
        trustProxy: trustedProxies.length > 0 ? trustedProxies : false,
      },
    ),
  );
  const configService = app.get(ConfigService);
  const allowedOrigins = configService
    .getOrThrow<string>('APP_ORIGINS')
    .split(',');

  await app.register(fastifyCookie as never);
  await app.register(fastifyMultipart as never, { limits: { files: 1, fields: 1, parts: 2, fileSize: 5 * 1024 * 1024 } });
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    exposedHeaders: ['ETag', 'x-request-id', 'Retry-After'],
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.setGlobalPrefix('v1');
  const openApiConfig = new DocumentBuilder()
    .addGlobalParameters({ in: 'header', name: 'X-Marriage-Request-Id', required: false, description: 'Invitation context locator; grants no access without server identity and resource checks.', schema: { type: 'string', format: 'uuid' } })
    .addGlobalParameters({ in: 'header', name: 'X-Analytics-Context', required: false, description: 'Optional consented, property-scoped anonymous analytics context (JSON, <=1024 characters). Invalid or absent context is ignored; never authorizes a business operation.', schema: { type: 'string', maxLength: 1024 } })
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
  const openApiDocument = normalizeOpenApiParameterOrder(
    SwaggerModule.createDocument(app, openApiConfig),
  );

  if (configService.get<string>('NODE_ENV') !== 'production') {
    SwaggerModule.setup('docs', app, openApiDocument, {
      jsonDocumentUrl: 'docs-json',
      swaggerOptions: SWAGGER_UI_OPTIONS,
      useGlobalPrefix: false,
    });
  }
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
