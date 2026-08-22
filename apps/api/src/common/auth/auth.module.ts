import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';

import { AccessTokenGuard } from './access-token.guard';
import { AccessTokenService } from './access-token.service';

@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [
    AccessTokenService,
    {
      provide: APP_GUARD,
      useClass: AccessTokenGuard,
    },
  ],
  exports: [AccessTokenService],
})
export class AuthModule {}
