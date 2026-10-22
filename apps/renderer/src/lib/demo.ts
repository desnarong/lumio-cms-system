import { renderBuiltinBlocks } from '@lumio/blocks/render';
import {
  DEFAULT_CONTACT_FORM_FIELDS,
  HOME_SLUG,
  cartTotals,
  commerceSettingsSchema,
  localePathFor,
  orderNumberFor,
  promptPayPayload,
  validateFormSubmission,
  type BlockNode,
  type PublicContent,
  type PublicForm,
  type PublicGlobalBlocks,
  type PublicPage,
  type PublicPostList,
  type PublicSite,
  type PublicSitemap,
  type PublicTranslation,
  type OrderCreatedResponse,
  type ShopCart,
  type ShopCartResponse,
  type ShopHomeResponse,
  type ShopOrderResponse,
  type ShopProduct,
  type ShopProductResponse,
  type SubmitFormInput,
} from '@lumio/shared';
import { ContentNotFoundError, type PublicApi } from './api';

/**
 * Content the renderer shows when no API is configured (or when the API is not
 * running yet). It uses the real block defaults, so the demo site looks exactly
 * like a site built in the editor.
 */

const definitionOf = (type: string) => {
  const definition = renderBuiltinBlocks.find((block) => block.type === type);
  if (!definition) throw new Error(`Block "${type}" is not shipped with Lumio`);
  return definition;
};

/** Builds a demo block node from a built-in block's own defaults. */
export const demoBlock = (
  id: string,
  type: string,
  props: Record<string, unknown> = {},
): BlockNode => {
  const definition = definitionOf(type);
  const data = definition.schema.parse({
    version: definition.defaults.version,
    props: { ...definition.defaults.props, ...props },
    style: definition.defaults.style,
  });
  return {
    id,
    type,
    version: data.version,
    props: data.props,
    style: data.style,
    children: [],
  };
};


const shopSwatch = (top: string, bottom: string, label: string): string =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480" role="img" aria-label="${label}">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs>` +
      `<rect width="640" height="480" fill="url(#g)"/><text x="32" y="440" fill="#ffffff" font-family="system-ui" font-size="30">${label}</text></svg>`,
  )}`;

const demoSettings = commerceSettingsSchema.parse({
  promptPayId: '0812345678',
  shippingFee: 5_000,
  freeShippingThreshold: 50_000,
});

const demoProducts: ShopProduct[] = [
  {
    id: '00000000-0000-4000-8000-000000000201',
    title: 'กาแฟคั่วกลางดอยช้าง 250 กรัม',
    slug: 'doichang-medium-roast-250g',
    description:
      'เมล็ดอาราบิก้าจากดอยช้าง คั่วกลาง หอมช็อกโกแลตและผลไม้แห้ง เหมาะกับเครื่องชงทุกแบบ',
    price: 35_000,
    compareAtPrice: 42_000,
    currency: 'THB',
    images: [shopSwatch('#c9793c', '#5b2f16', 'เมล็ดกาแฟ')],
    stock: 24,
    inStock: true,
    weightGrams: 250,
    options: [],
    variants: [],
    category: 'เมล็ดกาแฟ',
  },
  {
    id: '00000000-0000-4000-8000-000000000202',
    title: 'ชุดดริปกาแฟ 10 ซอง',
    slug: 'drip-coffee-10-packs',
    description: 'ดริปกาแฟคั่วใหม่ 10 ซอง ชงง่ายด้วยน้ำร้อน พกไปทำงานได้ทุกวัน',
    price: 25_000,
    compareAtPrice: null,
    currency: 'THB',
    images: [shopSwatch('#8d5a3b', '#2f2118', 'ดริป')],
    stock: 40,
    inStock: true,
    weightGrams: 200,
    options: [],
    variants: [],
    category: 'ชุดพร้อมชง',
  },
  {
    id: '00000000-0000-4000-8000-000000000203',
    title: 'แก้วเซรามิกบ้านดอย',
    slug: 'baandoi-ceramic-mug',
    description: 'แก้วเซรามิก handmade ขนาด 300 มล. ทรงถนัดมือ ลายจากช่างในเชียงใหม่',
    price: 29_000,
    compareAtPrice: null,
    currency: 'THB',
    images: [shopSwatch('#3f7d5a', '#14342a', 'แก้วเซรามิก')],
    stock: null,
    inStock: true,
    weightGrams: 400,
    options: [],
    variants: [],
    category: 'ของที่ระลึก',
  },
];

const demoOrders = new Map<string, ShopOrderResponse['order']>();

const pricedCart = (
  items: readonly { productId: string; quantity: number }[],
): ShopCart => {
  const lines = items.flatMap((item) => {
    const product = demoProducts.find((entry) => entry.id === item.productId);
    if (!product) return [];
    return [{
      product,
      variantId: null,
      variantLabel: null,
      quantity: item.quantity,
      lineTotal: product.price * item.quantity,
    }];
  });
  const totals = cartTotals(
    lines.map((line) => ({ price: line.product.price, quantity: line.quantity })),
    demoSettings,
  );
  return {
    items: lines,
    count: lines.reduce((sum, line) => sum + line.quantity, 0),
    ...totals,
    currency: 'THB',
  };
};

export const demoSite: PublicSite = {
  id: '00000000-0000-4000-8000-0000000000a1',
  name: 'กาแฟบ้านดอย',
  subdomain: 'baandoi',
  localeDefault: 'th',
  locales: ['th', 'en'],
  themeTokens: {
    colors: { primary: '#8B5E3C', accent: '#D9A05B', neutral: 'stone' },
    fonts: { heading: 'Prompt', body: 'Noto Sans Thai' },
    radius: 'lg',
    button: 'soft',
    density: 'comfortable',
    colorMode: 'light',
    animation: 'soft',
  },
  settings: { timezone: 'Asia/Bangkok' },
  logoUrl: null,
};

export const demoMenus = {
  header: [
    { label: 'หน้าแรก', href: '/', children: [] },
    { label: 'เกี่ยวกับเรา', href: '/about', children: [] },
    { label: 'บทความ', href: '/posts', children: [] },
  ],
  footer: [{ label: 'ติดต่อเรา', href: '/contact', children: [] }],
};

/** Contact form the demo site renders, so the form block works without an API. */
export const demoForm: PublicForm = {
  id: '00000000-0000-4000-8000-0000000000f1',
  name: 'ติดต่อเรา',
  fields: DEFAULT_CONTACT_FORM_FIELDS,
  successMessage: 'ได้รับข้อความแล้ว ขอบคุณที่ติดต่อเรา',
};

export const demoForms: PublicForm[] = [demoForm];

/** Global header/footer the demo site would have got from its template. */
export const demoGlobalBlocks: PublicGlobalBlocks = {
  header: [
    demoBlock('demo-header-cta', 'button', { label: 'โทรสอบถาม', href: '/about', align: 'right' }),
  ],
  footer: [
    demoBlock('demo-footer-name', 'heading', { text: 'กาแฟบ้านดอย', level: 'h4' }),
    demoBlock('demo-footer-note', 'paragraph', {
      text: 'เปิดทุกวัน 07:00-18:00 น. · 128 ถนนนิมมานเหมินท์ เชียงใหม่',
    }),
  ],
};

const demoHome: PublicContent = {
  id: '00000000-0000-4000-8000-0000000000c1',
  type: 'page',
  title: 'หน้าแรก',
  slug: HOME_SLUG,
  locale: 'th',
  excerpt: 'กาแฟคั่วสดใหม่ทุกเช้าใจกลางเชียงใหม่',
  seo: {
    title: 'กาแฟบ้านดอย — กาแฟคั่วสดใหม่เชียงใหม่',
    description: 'ร้านกาแฟคั่วเอง ชงมือ ใจกลางเมืองเชียงใหม่',
    noindex: false,
  },
  blocks: [
    demoBlock('demo-hero', 'hero'),
    demoBlock('demo-features', 'features'),
    demoBlock('demo-form', 'form', { formId: demoForm.id }),
    demoBlock('demo-language', 'language-switcher', {}),
  ],
  publishedAt: '2026-09-01T02:00:00.000Z',
  updatedAt: '2026-10-20T00:00:00.000Z',
  coverImage: null,
};

const demoAbout: PublicContent = {
  id: '00000000-0000-4000-8000-0000000000c2',
  type: 'page',
  title: 'เกี่ยวกับเรา',
  slug: 'about',
  locale: 'th',
  excerpt: 'เริ่มคั่วกาแฟให้เพื่อนบ้านตั้งแต่ปี 2015',
  seo: { noindex: false },
  blocks: [
    demoBlock('demo-about-heading', 'heading', {
      text: 'เรื่องราวของกาแฟบ้านดอย',
      level: 'h1',
    }),
    demoBlock('demo-about-text', 'paragraph', {
      text: 'เริ่มคั่วกาแฟให้เพื่อนบ้านตั้งแต่ปี 2015 จนวันนี้ส่งไปทั่วประเทศ',
    }),
  ],
  publishedAt: '2026-09-05T02:00:00.000Z',
  updatedAt: '2026-09-05T02:00:00.000Z',
  coverImage: null,
};

const demoPost: PublicContent = {
  id: '00000000-0000-4000-8000-0000000000c3',
  type: 'post',
  title: '3 วิธีเลือกเมล็ดกาแฟให้ถูกปาก',
  slug: 'how-to-pick-beans',
  locale: 'th',
  excerpt: 'เริ่มจากดูระดับการคั่ว แล้วค่อยปรับตามรสที่ชอบ',
  seo: { title: 'เลือกเมล็ดกาแฟให้ถูกปาก', noindex: false },
  blocks: [
    demoBlock('demo-post-heading', 'heading', {
      text: '3 วิธีเลือกเมล็ดกาแฟให้ถูกปาก',
      level: 'h1',
    }),
    demoBlock('demo-post-text', 'paragraph', {
      text: 'เริ่มจากดูระดับการคั่ว แล้วค่อยปรับตามรสที่ชอบ',
    }),
  ],
  publishedAt: '2026-10-01T02:00:00.000Z',
  updatedAt: '2026-10-01T02:00:00.000Z',
  coverImage: null,
};

// An English translation of the home and about pages, so the language switcher
// and the hreflang output can be tried without an API (docs/design/17-i18n.md).
const demoHomeEn: PublicContent = {
  ...demoHome,
  id: '00000000-0000-4000-8000-0000000000c4',
  title: 'Home',
  locale: 'en',
  excerpt: 'Freshly roasted coffee in the heart of Chiang Mai',
  seo: { title: 'Ban Doi Coffee — freshly roasted in Chiang Mai', noindex: false },
  blocks: [
    demoBlock('demo-hero-en', 'hero', {
      heading: 'Ban Doi Coffee',
      subheading: 'Roasted fresh every morning in Chiang Mai',
    }),
    demoBlock('demo-language-en', 'language-switcher', {}),
  ],
};

const demoAboutEn: PublicContent = {
  id: '00000000-0000-4000-8000-0000000000c5',
  type: 'page',
  title: 'About',
  slug: 'about',
  locale: 'en',
  excerpt: 'We started roasting coffee for our neighbours in 2015',
  seo: { noindex: false },
  blocks: [
    demoBlock('demo-about-en-heading', 'heading', {
      text: 'Our story',
      level: 'h1',
    }),
    demoBlock('demo-about-en-text', 'paragraph', {
      text: 'We started roasting coffee for our neighbours in 2015 and now ship nationwide.',
    }),
  ],
  publishedAt: '2026-09-05T02:00:00.000Z',
  updatedAt: '2026-09-05T02:00:00.000Z',
  coverImage: null,
};

export const demoContents: PublicContent[] = [
  demoHome,
  demoAbout,
  demoPost,
  demoHomeEn,
  demoAboutEn,
];

const translationsFor = (content: PublicContent): PublicTranslation[] =>
  demoSite.locales.map((locale) => {
    const match = demoContents.find(
      (item) => item.type === content.type && item.slug === content.slug && item.locale === locale,
    );
    return {
      locale,
      path: localePathFor(content.type, content.slug, locale, demoSite.localeDefault),
      title: match?.title ?? null,
      available: Boolean(match),
    };
  });

const pageOf = (content: PublicContent, requested: string): PublicPage => ({
  site: demoSite,
  content,
  menus: demoMenus,
  globalBlocks: demoGlobalBlocks,
  forms: content.blocks.some((block) => block.type === 'form') ? demoForms : [],
  locale: content.locale,
  isFallback: requested !== content.locale,
  translations: translationsFor(content),
  redirect: null,
});

const summaryOf = (content: PublicContent) => ({
  id: content.id,
  title: content.title,
  slug: content.slug,
  excerpt: content.excerpt,
  publishedAt: content.publishedAt,
  coverImage: content.coverImage,
});

/** A requested language the demo site does not offer falls back to its default. */
const requestedLocale = (locale?: string): string =>
  locale && demoSite.locales.includes(locale) ? locale : demoSite.localeDefault;

const findContent = (type: PublicContent['type'], slug: string, locale: string) =>
  demoContents.find((item) => item.type === type && item.slug === slug && item.locale === locale) ??
  demoContents.find(
    (item) => item.type === type && item.slug === slug && item.locale === demoSite.localeDefault,
  );

export const createDemoPublicApi = (): PublicApi => ({
  async getPage(_host: string, slug: string, locale?: string): Promise<PublicPage> {
    const requested = requestedLocale(locale);
    const content = findContent('page', slug, requested);
    if (!content) throw new ContentNotFoundError();
    return pageOf(content, requested);
  },
  async getPost(_host: string, slug: string, locale?: string): Promise<PublicPage> {
    const requested = requestedLocale(locale);
    const content = findContent('post', slug, requested);
    if (!content) throw new ContentNotFoundError();
    return pageOf(content, requested);
  },
  async listPosts(_host: string, locale?: string): Promise<PublicPostList> {
    const requested = requestedLocale(locale);
    let effective = requested;
    let posts = demoContents.filter((item) => item.type === 'post' && item.locale === requested);
    if (posts.length === 0 && requested !== demoSite.localeDefault) {
      effective = demoSite.localeDefault;
      posts = demoContents.filter((item) => item.type === 'post' && item.locale === effective);
    }

    return {
      site: demoSite,
      menus: demoMenus,
      globalBlocks: demoGlobalBlocks,
      locale: effective,
      posts: posts.map(summaryOf),
    };
  },
  async getSitemap(): Promise<PublicSitemap> {
    const urls = demoContents.map((content) => {
      const siblings = demoContents.filter(
        (item) => item.type === content.type && item.slug === content.slug,
      );
      return {
        path: localePathFor(content.type, content.slug, content.locale, demoSite.localeDefault),
        lastmod: content.updatedAt,
        type: content.type,
        alternates: siblings.map((sibling) => ({
          locale: sibling.locale,
          path: localePathFor(
            sibling.type,
            sibling.slug,
            sibling.locale,
            demoSite.localeDefault,
          ),
          title: sibling.title,
          available: true,
        })),
      };
    });

    return {
      site: demoSite,
      urls,
      shop: demoProducts.map((product) => ({ path: `/shop/${product.slug}`, lastmod: null })),
    };
  },
  async getPreview(_token: string): Promise<PublicPage> {
    const page = await this.getPage('baandoi.example.com', 'home', 'th');
    if (!page.content) throw new ContentNotFoundError('ไม่พบหน้านี้');
    return { ...page, content: { ...page.content, seo: { ...page.content.seo, noindex: true } } };
  },
  async submitForm(_host: string, formId: string, input: SubmitFormInput) {
    const form = demoForms.find((entry) => entry.id === formId);
    if (!form) throw new ContentNotFoundError('ไม่พบฟอร์มนี้');
    if (input.honeypot && input.honeypot.length > 0) return { ok: true };

    const result = validateFormSubmission(form.fields, input.data);
    if (!result.ok) throw new Error('ข้อมูลในฟอร์มยังไม่ถูกต้อง');
    return { ok: true };
  },
  async getShop(): Promise<ShopHomeResponse> {
    return {
      site: demoSite,
      menus: demoMenus,
      globalBlocks: demoGlobalBlocks,
      locale: demoSite.localeDefault,
      products: demoProducts,
      categories: [...new Set(demoProducts.flatMap((product) => (product.category ? [product.category] : [])))],
      settings: demoSettings,
    };
  },
  async getShopProduct(_host: string, slug: string): Promise<ShopProductResponse> {
    const product = demoProducts.find((entry) => entry.slug === slug);
    if (!product) throw new ContentNotFoundError();
    return {
      site: demoSite,
      menus: demoMenus,
      globalBlocks: demoGlobalBlocks,
      locale: demoSite.localeDefault,
      product,
      related: demoProducts.filter((entry) => entry.id !== product.id && entry.category === product.category),
      settings: demoSettings,
    };
  },
  async priceCart(_host: string, items): Promise<ShopCartResponse> {
    return {
      site: demoSite,
      menus: demoMenus,
      globalBlocks: demoGlobalBlocks,
      locale: demoSite.localeDefault,
      cart: pricedCart(items),
      settings: demoSettings,
    };
  },
  async createOrder(_host: string, input): Promise<OrderCreatedResponse> {
    const cart = pricedCart(input.items);
    const now = new Date();
    const number = orderNumberFor(now, Math.random().toString(36).slice(2, 8));
    const order = {
      number,
      token: `demo-${number}`,
      status: 'pending' as const,
      paymentMethod: input.paymentMethod,
      customerName: input.customer.name,
      customerPhone: input.customer.phone,
      items: cart.items.map((line) => ({
        productId: line.product.id,
        variantId: null,
        variantLabel: null,
        title: line.product.title,
        price: line.product.price,
        quantity: line.quantity,
        image: line.product.images[0] ?? null,
        lineTotal: line.lineTotal,
      })),
      subtotal: cart.subtotal,
      shippingFee: cart.shippingFee,
      total: cart.total,
      currency: 'THB',
      trackingNumber: null,
      paymentUrl: null,
      slip: null,
      createdAt: now.toISOString(),
      paidAt: null,
      refundedAmount: 0,
      refundedAt: null,
      refundReason: '',
    };
    demoOrders.set(order.token, order);
    return {
      order,
      payment: {
        promptPayPayload:
          input.paymentMethod === 'promptpay' && demoSettings.promptPayId
            ? promptPayPayload(demoSettings.promptPayId, cart.total)
            : null,
        promptPayId: demoSettings.promptPayId,
        redirectUrl: null,
      },
    };
  },
  async getOrder(_host: string, token: string): Promise<ShopOrderResponse> {
    const order = demoOrders.get(token);
    if (!order) throw new ContentNotFoundError();
    return {
      site: demoSite,
      menus: demoMenus,
      globalBlocks: demoGlobalBlocks,
      locale: demoSite.localeDefault,
      order,
      payment: {
        promptPayPayload:
          order.status === 'pending' && order.paymentMethod === 'promptpay' && demoSettings.promptPayId
            ? promptPayPayload(demoSettings.promptPayId, order.total)
            : null,
        promptPayId: demoSettings.promptPayId,
        redirectUrl: null,
      },
      settings: demoSettings,
    };
  },
  async submitSlip(_host: string, token: string, input): Promise<{ status: 'pending_review' | 'verified' | 'rejected'; autoVerified: boolean; message: string }> {
    const order = demoOrders.get(token);
    if (!order) throw new ContentNotFoundError('ไม่พบคำสั่งซื้อนี้');
    const autoVerified = input.amount === order.total;
    if (autoVerified) {
      demoOrders.set(token, {
        ...order,
        status: 'paid',
        paidAt: new Date().toISOString(),
        slip: {
          id: 'demo-slip',
          status: 'verified',
          amount: input.amount,
          reference: input.reference,
          imageUrl: '',
          note: 'ยืนยันอัตโนมัติจากยอดเงินที่ตรงกัน',
          createdAt: new Date().toISOString(),
        },
      });
    }
    return {
      status: autoVerified ? 'verified' : 'pending_review',
      autoVerified,
      message: autoVerified
        ? 'ได้รับสลิปแล้ว ยอดเงินตรงกับคำสั่งซื้อ ระบบยืนยันการชำระเงินให้ทันที'
        : 'ได้รับสลิปแล้ว ร้านจะตรวจสอบและยืนยันการชำระเงินให้เร็วที่สุด',
    };
  },
  async collectPageview(): Promise<void> {
    // Demo mode has no analytics store; the beacon is a no-op.
  },
});
