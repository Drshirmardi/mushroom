import { Module } from '@nestjs/common';

import { SelfProfileController } from './self-profile.controller';
import { SelfProfileService } from './self-profile.service';

@Module({
  controllers: [SelfProfileController],
  providers: [SelfProfileService],
  exports: [SelfProfileService],
})
export class SelfProfileModule {}
