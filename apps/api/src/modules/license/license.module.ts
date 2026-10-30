import { Global, Module } from '@nestjs/common';
import { LicenseController, PublicLicenseController } from './license.controller';
import { LicenseService } from './license.service';
import { LicenseStore } from './license.store';

/** Global: feature flags and future paid modules ask this service about the licence. */
@Global()
@Module({
  controllers: [LicenseController, PublicLicenseController],
  providers: [LicenseService, LicenseStore],
  exports: [LicenseService, LicenseStore],
})
export class LicenseModule {}
