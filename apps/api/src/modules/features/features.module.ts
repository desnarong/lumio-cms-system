import { Global, Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { FeatureGuard } from './feature.guard';
import { FeaturesController } from './features.controller';
import { FeaturesService } from './features.service';

/**
 * Global so any controller can add `FeatureGuard` without importing this module
 * again; the guard reads the flag from the site resolved by SiteGuard.
 */
@Global()
@Module({
  imports: [AuditModule],
  controllers: [FeaturesController],
  providers: [FeaturesService, FeatureGuard],
  exports: [FeaturesService, FeatureGuard],
})
export class FeaturesModule {}
