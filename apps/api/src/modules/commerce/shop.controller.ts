import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  cartInputSchema,
  createOrderInputSchema,
  orderLookupInputSchema,
  paymentSlipInputSchema,
  receiptFileName,
  renderReceiptHtml,
} from '@lumio/shared';
import { ok } from '../../common/api-response';
import { RateLimit, RateLimitGuard } from '../../common/rate-limit.guard';
import { PublicCacheInterceptor } from '../public/public-cache.interceptor';
import { renderReceiptPdf } from './receipt-pdf';
import { ShopService } from './shop.service';

const SHOP_CACHE = new PublicCacheInterceptor({
  maxAge: 60,
  sMaxAge: 300,
  staleWhileRevalidate: 600,
});

const safeSlug = (slug: string): string => slug.slice(0, 200);

const safeLocale = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const locale = value.trim().toLowerCase();
  return locale.length >= 2 && locale.length <= 10 ? locale : undefined;
};

/**
 * Anonymous storefront and checkout (docs/design/12-api.md 12.7). The tenant
 * comes from the host, checkout is rate limited, and every price is recalculated
 * on the server so a tampered cart cannot change what is charged.
 */
@Controller('v1/public/:host/shop')
@UseGuards(RateLimitGuard)
export class ShopController {
  constructor(private readonly shop: ShopService) {}

  @Get()
  @RateLimit({ limit: 300, windowMs: 60_000 })
  @UseInterceptors(SHOP_CACHE)
  async home(@Param('host') host: string, @Query('locale') locale: unknown) {
    return ok(await this.shop.home(host, safeLocale(locale)));
  }

  @Get('products/:slug')
  @RateLimit({ limit: 600, windowMs: 60_000 })
  @UseInterceptors(SHOP_CACHE)
  async product(
    @Param('host') host: string,
    @Param('slug') slug: string,
    @Query('locale') locale: unknown,
  ) {
    return ok(await this.shop.product(host, safeSlug(slug), safeLocale(locale)));
  }

  /** Prices a cart without writing anything, so the cart page needs no session. */
  @Post('cart')
  @RateLimit({ limit: 240, windowMs: 60_000 })
  async cart(@Param('host') host: string, @Body() body: unknown, @Query('locale') locale: unknown) {
    const input = cartInputSchema.parse(body);
    return ok(await this.shop.cart(host, input, safeLocale(locale)));
  }

  @Post('orders')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  async createOrder(
    @Param('host') host: string,
    @Body() body: unknown,
    @Query('locale') locale: unknown,
  ) {
    const input = createOrderInputSchema.parse(body);
    return ok(await this.shop.createOrder(host, input, safeLocale(locale)));
  }

  /** The token is the buyer's only key, so this answer is never cached. */
  @Get('orders/:token')
  @RateLimit({ limit: 120, windowMs: 60_000 })
  @Header('cache-control', 'no-store')
  async order(
    @Param('host') host: string,
    @Param('token') token: string,
    @Query('locale') locale: unknown,
  ) {
    return ok(await this.shop.order(host, token.slice(0, 100), safeLocale(locale)));
  }

  /** Reopens an order from its number plus the phone or email used at checkout. */
  @Post('orders/lookup')
  @RateLimit({ limit: 10, windowMs: 60_000 })
  @Header('cache-control', 'no-store')
  async lookupOrder(@Param('host') host: string, @Body() body: unknown) {
    const input = orderLookupInputSchema.parse(body);
    return ok(await this.shop.lookupOrder(host, input));
  }

  /** Buyer uploads a PromptPay slip; an exact amount confirms the order at once. */
  @Post('orders/:token/slip')
  @RateLimit({ limit: 10, windowMs: 60_000 })
  async submitSlip(
    @Param('host') host: string,
    @Param('token') token: string,
    @Body() body: unknown,
    @Query('locale') locale: unknown,
  ) {
    const input = paymentSlipInputSchema.parse(body);
    return ok(await this.shop.submitSlip(host, token.slice(0, 100), input, safeLocale(locale)));
  }

  @Get('orders/:token/receipt.pdf')
  @RateLimit({ limit: 30, windowMs: 60_000 })
  @Header('cache-control', 'no-store')
  async receiptPdf(
    @Param('host') host: string,
    @Param('token') token: string,
    @Query('locale') locale: unknown,
    @Res() response: Response,
  ) {
    const receipt = await this.shop.receipt(host, token.slice(0, 100), safeLocale(locale));
    const pdf = await renderReceiptPdf(receipt);
    response
      .type('application/pdf')
      .setHeader('content-disposition', `attachment; filename="${receiptFileName(receipt.orderNumber)}"`)
      .send(pdf);
  }

  /** Printable receipt, safe for an <iframe> or a browser's "save as PDF". */
  @Get('orders/:token/receipt')
  @RateLimit({ limit: 60, windowMs: 60_000 })
  @Header('cache-control', 'no-store')
  async receipt(
    @Param('host') host: string,
    @Param('token') token: string,
    @Query('locale') locale: unknown,
    @Res() response: Response,
  ) {
    const receipt = await this.shop.receipt(host, token.slice(0, 100), safeLocale(locale));
    response.type('html').send(renderReceiptHtml(receipt, { autoPrint: false }));
  }
}
