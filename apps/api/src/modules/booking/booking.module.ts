import { Module } from '@nestjs/common';
import { RateLimitGuard } from '../../common/rate-limit.guard';
import { AuditModule } from '../audit/audit.module';
import { EmailModule } from '../email/email.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PublicBookingController } from './booking-public.controller';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';

@Module({
  imports: [PrismaModule, AuditModule, EmailModule],
  controllers: [BookingController, PublicBookingController],
  providers: [BookingService, RateLimitGuard],
  exports: [BookingService],
})
export class BookingModule {}
