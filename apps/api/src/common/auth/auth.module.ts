import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';

import { AccessTokenGuard } from './access-token.guard';
import { AccessTokenService } from './access-token.service';
import { BrowserOriginService } from './browser-origin.service';
import { RefreshCookieService } from './refresh-cookie.service';

@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [
    AccessTokenService,
    BrowserOriginService,
    RefreshCookieService,
    {
      provide: APP_GUARD,
      useClass: AccessTokenGuard,
    },
  ],
  exports: [AccessTokenService, BrowserOriginService, RefreshCookieService],
})
export class AuthModule {}
