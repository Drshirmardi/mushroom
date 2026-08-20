import 'reflect-metadata';

import { ConfigService } from '@nestjs/config';

import { createApiApplication } from './app.factory';

async function bootstrap(): Promise<void> {
  const app = await createApiApplication();
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3003);

  await app.listen({ port, host: '0.0.0.0' });
}

void bootstrap();
