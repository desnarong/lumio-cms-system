import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AiModule } from './modules/ai/ai.module';
import { AppsModule } from './modules/apps/apps.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { BackupModule } from './modules/backup/backup.module';
import { BankingModule } from './modules/banking/banking.module';
import { BillingModule } from './modules/billing/billing.module';
import { CommerceModule } from './modules/commerce/commerce.module';
import { ContentsModule } from './modules/contents/contents.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DesignModule } from './modules/design/design.module';
import { DomainsModule } from './modules/domains/domains.module';
import { EmailModule } from './modules/email/email.module';
import { FeaturesModule } from './modules/features/features.module';
import { FormsModule } from './modules/forms/forms.module';
import { GlobalBlocksModule } from './modules/global-blocks/global-blocks.module';
import { HealthModule } from './modules/health/health.module';
import { LicenseModule } from './modules/license/license.module';
import { MediaModule } from './modules/media/media.module';
import { MembersModule } from './modules/members/members.module';
import { MembershipModule } from './modules/membership/membership.module';
import { MenusModule } from './modules/menus/menus.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { NewsletterModule } from './modules/newsletter/newsletter.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { PublicModule } from './modules/public/public.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { PublishModule } from './modules/publish/publish.module';
import { RedirectsModule } from './modules/redirects/redirects.module';
import { SectionTemplatesModule } from './modules/section-templates/section-templates.module';
import { SeoModule } from './modules/seo/seo.module';
import { SitesModule } from './modules/sites/sites.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { UpdatesModule } from './modules/updates/updates.module';
import { OriginGuard } from './common/origin.guard';
import { RateLimitModule } from './common/rate-limit.module';

@Module({
  imports: [
    PrismaModule,
    RateLimitModule,
    FeaturesModule,
    LicenseModule,
    AuditModule,
    AuthModule,
    HealthModule,
    SitesModule,
    MembersModule,
    MembershipModule,
    ContentsModule,
    CommerceModule,
    DashboardModule,
    TemplatesModule,
    DesignModule,
    GlobalBlocksModule,
    MenusModule,
    MarketplaceModule,
    SectionTemplatesModule,
    DomainsModule,
    EmailModule,
    RedirectsModule,
    FormsModule,
    SeoModule,
    AnalyticsModule,
    NewsletterModule,
    AppsModule,
    BankingModule,
    BillingModule,
    BackupModule,
    AiModule,
    PublicModule,
    PublishModule,
    PromotionsModule,
    MediaModule,
    UpdatesModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: OriginGuard }],
})
export class AppModule {}
