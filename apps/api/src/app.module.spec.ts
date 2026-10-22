import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { AppModule } from './app.module';
import { AuthController } from './modules/auth/auth.controller';
import { BankingController } from './modules/banking/banking.controller';
import { BankingService } from './modules/banking/banking.service';
import { HealthController } from './modules/health/health.controller';
import { MembersController } from './modules/members/members.controller';
import { PrismaService } from './modules/prisma/prisma.service';
import { PublicController } from './modules/public/public.controller';
import { PublicService } from './modules/public/public.service';
import { PublishProcessor } from './modules/publish/publish.processor';
import { PublishService } from './modules/publish/publish.service';
import { RolesGuard } from './modules/rbac/roles.guard';
import { SiteGuard } from './modules/site/site.guard';
import { SitesController } from './modules/sites/sites.controller';

/**
 * Guards against a class being imported as a type only: Nest resolves
 * constructor dependencies from the emitted decorator metadata, so every
 * provider and controller must be instantiable here.
 */
const fakeDb = {
  forSite: () => Promise.resolve(undefined),
  forUser: () => Promise.resolve(undefined),
};

describe('AppModule wiring', () => {
  it('instantiates every controller and guard', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(fakeDb)
      .compile();

    expect(moduleRef.get(AuthController)).toBeDefined();
    expect(moduleRef.get(SitesController)).toBeDefined();
    expect(moduleRef.get(MembersController)).toBeDefined();
    expect(moduleRef.get(HealthController)).toBeDefined();
    expect(moduleRef.get(PublicController)).toBeDefined();
    expect(moduleRef.get(PublicService)).toBeDefined();
    expect(moduleRef.get(BankingController)).toBeDefined();
    expect(moduleRef.get(BankingService)).toBeDefined();
    expect(moduleRef.get(PublishService)).toBeDefined();
    expect(moduleRef.get(PublishProcessor)).toBeDefined();
    expect(moduleRef.get(SiteGuard)).toBeDefined();
    expect(moduleRef.get(RolesGuard)).toBeDefined();

    await moduleRef.close();
  });
});
