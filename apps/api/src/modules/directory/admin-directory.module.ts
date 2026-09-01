import { Module } from '@nestjs/common';

import { AdminDirectoryController } from './admin-directory.controller';
import { AdminDirectoryService } from './admin-directory.service';

@Module({ controllers: [AdminDirectoryController], providers: [AdminDirectoryService] })
export class AdminDirectoryModule {}
