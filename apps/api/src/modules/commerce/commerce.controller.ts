import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  createProductInputSchema,
  orderListQuerySchema,
  productListQuerySchema,
  refundOrderInputSchema,
  reviewSlipInputSchema,
  updateCommerceSettingsInputSchema,
  updateOrderStatusInputSchema,
  updateOrderWebhookInputSchema,
  updateProductInputSchema,
  type Role,
} from '@lumio/shared';
import { ok } from '../../common/api-response';
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { CurrentSite } from '../site/current-site.decorator';
import { SiteGuard } from '../site/site.guard';
import { FeatureGuard, RequireFeature } from '../features/feature.guard';
import { CommerceService } from './commerce.service';

const READ_ROLES: Role[] = ['owner', 'admin', 'editor', 'author', 'viewer'];
const WRITE_ROLES: Role[] = ['owner', 'admin', 'editor'];
/** Webhook URLs and signing secrets are owner/admin territory. */
const SETTINGS_ROLES: Role[] = ['owner', 'admin'];

/** Products, orders and payment settings of one site (docs/design/03-scope.md 3.3). */
@Controller('v1')
@UseGuards(AuthGuard, SiteGuard, RolesGuard, FeatureGuard)
@RequireFeature('commerce')
export class CommerceController {
  constructor(private readonly commerce: CommerceService) {}

  @Get('commerce/settings')
  @Roles(...READ_ROLES)
  async settings(@CurrentSite() siteId: string) {
    return ok(await this.commerce.getSettings(siteId));
  }

  @Patch('commerce/settings')
  @Roles(...WRITE_ROLES)
  async updateSettings(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = updateCommerceSettingsInputSchema.parse(body);
    return ok(await this.commerce.updateSettings(siteId, input, user.id));
  }

  /** Outbound order/payment webhook: read returns metadata, never the secret. */
  @Get('commerce/webhook')
  @Roles(...SETTINGS_ROLES)
  async webhook(@CurrentSite() siteId: string) {
    return ok(await this.commerce.getWebhook(siteId));
  }

  @Patch('commerce/webhook')
  @Roles(...SETTINGS_ROLES)
  async updateWebhook(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = updateOrderWebhookInputSchema.parse(body);
    return ok(await this.commerce.updateWebhook(siteId, input, user.id));
  }

  /** Delivers a sample paid order so the owner can check their receiver. */
  @Post('commerce/webhook/test')
  @Roles(...SETTINGS_ROLES)
  async testWebhook(@CurrentSite() siteId: string, @CurrentUser() user: AuthenticatedUser) {
    return ok(await this.commerce.testWebhook(siteId, user.id));
  }

  @Get('commerce/connect')
  @Roles(...READ_ROLES)
  async connectStatus(@CurrentSite() siteId: string) {
    return ok(await this.commerce.connectStatus(siteId));
  }

  /** Starts (or restarts) Stripe onboarding for the seller's payouts account. */
  @Post('commerce/connect/link')
  @Roles(...WRITE_ROLES)
  async connectLink(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return ok(await this.commerce.connectLink(siteId, user.id, user.email ?? null));
  }

  @Post('commerce/connect/refresh')
  @Roles(...WRITE_ROLES)
  async connectRefresh(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return ok(await this.commerce.refreshConnect(siteId, user.id));
  }

  @Get('products')
  @Roles(...READ_ROLES)
  async products(@CurrentSite() siteId: string, @Query() query: unknown) {
    const parsed = productListQuerySchema.parse(query);
    const page = await this.commerce.listProducts(siteId, parsed);
    return ok(page.items, { cursor: page.cursor, total: page.total });
  }

  @Post('products')
  @Roles(...WRITE_ROLES)
  async createProduct(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = createProductInputSchema.parse(body);
    return ok(await this.commerce.createProduct(siteId, input, user.id));
  }

  @Patch('products/:productId')
  @Roles(...WRITE_ROLES)
  async updateProduct(
    @CurrentSite() siteId: string,
    @Param('productId') productId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = updateProductInputSchema.parse(body);
    return ok(await this.commerce.updateProduct(siteId, productId, input, user.id));
  }

  @Delete('products/:productId')
  @Roles(...WRITE_ROLES)
  async archiveProduct(
    @CurrentSite() siteId: string,
    @Param('productId') productId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.commerce.archiveProduct(siteId, productId, user.id);
    return ok({ success: true });
  }

  @Get('orders')
  @Roles(...READ_ROLES)
  async orders(@CurrentSite() siteId: string, @Query() query: unknown) {
    const parsed = orderListQuerySchema.parse(query);
    const page = await this.commerce.listOrders(siteId, parsed);
    return ok(page.items, { cursor: page.cursor, total: page.total });
  }

  @Get('orders/:orderId')
  @Roles(...READ_ROLES)
  async order(@CurrentSite() siteId: string, @Param('orderId') orderId: string) {
    return ok(await this.commerce.getOrder(siteId, orderId));
  }

  @Patch('orders/:orderId/status')
  @Roles(...WRITE_ROLES)
  async updateOrder(
    @CurrentSite() siteId: string,
    @Param('orderId') orderId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = updateOrderStatusInputSchema.parse(body);
    return ok(await this.commerce.updateOrderStatus(siteId, orderId, input, user.id));
  }

  @Post('orders/:orderId/refund')
  @Roles(...SETTINGS_ROLES)
  async refundOrder(
    @CurrentSite() siteId: string,
    @Param('orderId') orderId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = refundOrderInputSchema.parse(body);
    return ok(await this.commerce.refundOrder(siteId, orderId, input, user.id));
  }

  @Post('orders/:orderId/slip/review')
  @Roles(...WRITE_ROLES)
  async reviewSlip(
    @CurrentSite() siteId: string,
    @Param('orderId') orderId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = reviewSlipInputSchema.parse(body);
    return ok(await this.commerce.reviewSlip(siteId, orderId, input, user.id));
  }
}
