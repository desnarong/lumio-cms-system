import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { LicenseModule } from '../license/license.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AgencyController } from './agency.controller';
import { AgencyService } from './agency.service';

@Module({
  imports: [PrismaModule, AuditModule, LicenseModule],
  controllers: [AgencyController],
  providers: [AgencyService],
  exports: [AgencyService],
})
export class AgencyModule {}
