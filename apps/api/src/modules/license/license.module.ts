import { Global, Module } from '@nestjs/common';
import { LicenseController, PublicLicenseController } from './license.controller';
import { LicenseService } from './license.service';

/** Global: feature flags and future paid modules ask this service about the licence. */
@Global()
@Module({
  controllers: [LicenseController, PublicLicenseController],
  providers: [LicenseService],
  exports: [LicenseService],
})
export class LicenseModule {}
