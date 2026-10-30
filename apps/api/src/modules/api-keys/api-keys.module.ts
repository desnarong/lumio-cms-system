import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RateLimitGuard } from '../../common/rate-limit.guard';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from './api-keys.service';
import { PublicApiController } from './public-api.controller';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [ApiKeysController, PublicApiController],
  providers: [ApiKeysService, RateLimitGuard],
  exports: [ApiKeysService],
})
export class ApiKeysModule {}
