import { hash } from '@node-rs/argon2';
import { PrismaClient, type Prisma } from '@prisma/client';
import { runForSite } from '../src/modules/prisma/site-context';

const prisma = new PrismaClient();

/** Shared demo password so the seeded accounts can sign in (see README). */
const DEMO_PASSWORD = 'lumio-demo-1234';

const ID = {
  owner: '00000000-0000-4000-8000-000000000001',
  editor: '00000000-0000-4000-8000-000000000002',
  cafeSite: '00000000-0000-4000-8000-0000000000a1',
  clinicSite: '00000000-0000-4000-8000-0000000000a2',
  cafeLogo: '00000000-0000-4000-8000-0000000000b1',
  cafeShop: '00000000-0000-4000-8000-0000000000b2',
  clinicTeam: '00000000-0000-4000-8000-0000000000b3',
  cafeHome: '00000000-0000-4000-8000-0000000000c1',
  cafeAbout: '00000000-0000-4000-8000-0000000000c2',
  cafePost: '00000000-0000-4000-8000-0000000000c3',
  cafeDraft: '00000000-0000-4000-8000-0000000000c4',
  clinicHome: '00000000-0000-4000-8000-0000000000c5',
  cafeCategory: '00000000-0000-4000-8000-0000000000d1',
  clinicCategory: '00000000-0000-4000-8000-0000000000d2',
  cafeHeaderMenu: '00000000-0000-4000-8000-0000000000e1',
  cafeFooterMenu: '00000000-0000-4000-8000-0000000000e2',
  clinicHeaderMenu: '00000000-0000-4000-8000-0000000000e3',
  cafeHeaderBlock: '00000000-0000-4000-8000-0000000000f1',
  cafeFooterBlock: '00000000-0000-4000-8000-0000000000f2',
  clinicHeaderBlock: '00000000-0000-4000-8000-0000000000f3',
  cafeContactForm: '00000000-0000-4000-8000-000000000101',
  clinicBookingForm: '00000000-0000-4000-8000-000000000102',
  cafeProductBeans: '00000000-0000-4000-8000-000000000201',
  cafeProductDrip: '00000000-0000-4000-8000-000000000202',
  cafeProductMug: '00000000-0000-4000-8000-000000000203',
  cafeOrder: '00000000-0000-4000-8000-000000000211',
  cafeOrderItemBeans: '00000000-0000-4000-8000-000000000212',
  cafeOrderItemDrip: '00000000-0000-4000-8000-000000000213',
} as const;

type JsonPrimitive = string | number | boolean | null;

type BlockStyle = {
  paddingY: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  paddingX: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  background: 'none' | 'surface' | 'muted' | 'accent' | 'brand';
  visibility: { mobile: boolean; tablet: boolean; desktop: boolean };
  animation: 'none' | 'fade-up' | 'fade-in' | 'zoom-in';
};

type BlockNode = {
  id: string;
  type: string;
  version: number;
  props: Record<string, JsonPrimitive>;
  style: BlockStyle;
  children: BlockNode[];
};

const style = (background: BlockStyle['background'] = 'none'): BlockStyle => ({
  paddingY: 'lg',
  paddingX: 'md',
  background,
  visibility: { mobile: true, tablet: true, desktop: true },
  animation: 'none',
});

let blockSeq = 0;
const nextBlockId = (): string => {
  blockSeq += 1;
  return `20000000-0000-4000-8000-${String(blockSeq).padStart(12, '0')}`;
};

const heading = (text: string, level: 'h1' | 'h2' | 'h3' = 'h2'): BlockNode => ({
  id: nextBlockId(),
  type: 'heading',
  version: 1,
  props: { text, level, align: 'left' },
  style: style(),
  children: [],
});

const paragraph = (text: string, background: BlockStyle['background'] = 'none'): BlockNode => ({
  id: nextBlockId(),
  type: 'paragraph',
  version: 1,
  props: { text, align: 'left', size: 'base' },
  style: style(background),
  children: [],
});

const blockTree = (...nodes: BlockNode[]): BlockNode[] => nodes;

const cafeHomeBlocks = (): BlockNode[] =>
  blockTree(
    heading('กาแฟดอยช้างคั่วสดใหม่ทุกเช้า', 'h1'),
    paragraph('ร้านกาแฟเล็ก ๆ ใจกลางเมืองเชียงใหม่ คั่วเมล็ดเองทุกสัปดาห์ ชงด้วยมือทุกแก้ว'),
    paragraph('เปิดทุกวัน 07:00 - 18:00 น.', 'surface'),
  );

const cafeAboutBlocks = (): BlockNode[] =>
  blockTree(
    heading('เรื่องราวของเรา', 'h1'),
    paragraph('เราเริ่มจากรถเข็นกาแฟหนึ่งคันเมื่อปี 2561 วันนี้มีหน้าร้านของตัวเองแล้ว'),
  );

const cafePostBlocks = (): BlockNode[] =>
  blockTree(
    heading('3 วิธีเลือกเมล็ดกาแฟให้ถูกปาก', 'h1'),
    paragraph('เริ่มจากดูระดับการคั่ว แล้วค่อยปรับตามรสที่ชอบ'),
  );

const clinicHomeBlocks = (): BlockNode[] =>
  blockTree(
    heading('คลินิกทันตกรรมยิ้มสวย', 'h1'),
    paragraph('ตรวจฟันฟรีครั้งแรก พร้อมทีมทันตแพทย์เฉพาะทาง จองคิวออนไลน์ได้ทุกวัน'),
  );

interface PageViewRow {
  path: string;
  referrer: string | null;
  country: string;
  device: string;
  sessionHash: string;
}

/**
 * pageviews is a partitioned table that Prisma does not model (@@ignore), so it
 * is written with raw SQL.
 */
async function insertPageViews(
  tx: Prisma.TransactionClient,
  siteId: string,
  rows: PageViewRow[],
): Promise<void> {
  for (const row of rows) {
    await tx.$executeRaw`
      INSERT INTO "pageviews" ("site_id", "path", "referrer", "country", "device", "session_hash")
      VALUES (${siteId}::uuid, ${row.path}, ${row.referrer}, ${row.country}, ${row.device}, ${row.sessionHash})
    `;
  }
}

async function reset(): Promise<void> {
  // pageviews has no foreign key to sites, so it is cleared explicitly.
  for (const siteId of [ID.cafeSite, ID.clinicSite]) {
    await runForSite(prisma, siteId, (tx) => tx.$executeRaw`DELETE FROM "pageviews"`);
  }
  await prisma.site.deleteMany({ where: { id: { in: [ID.cafeSite, ID.clinicSite] } } });
  await prisma.user.deleteMany({ where: { id: { in: [ID.owner, ID.editor] } } });
}

/**
 * Theme and template the demo sites start from. The ids match
 * templates/<pack>/manifest.json, so a seeded site behaves exactly like one the
 * onboarding wizard just created.
 */
const CAFE_TEMPLATE_ID = '6f12c9a0-1b34-4c5d-8e6f-7a8b9c0d1e2f';
const CLINIC_TEMPLATE_ID = '9a7b6c5d-4e3f-4a2b-9c1d-0e8f7a6b5c4d';

const CAFE_TOKENS = {
  colors: { primary: '#8B5E3C', accent: '#D9A05B', neutral: 'stone' },
  fonts: { heading: 'Prompt', body: 'Noto Sans Thai' },
  radius: 'lg',
  button: 'soft',
  density: 'comfortable',
  colorMode: 'light',
  animation: 'soft',
};

const CLINIC_TOKENS = {
  colors: { primary: '#0E7490', accent: '#22D3EE', neutral: 'slate' },
  fonts: { heading: 'Inter', body: 'Noto Sans Thai' },
  radius: 'sm',
  button: 'outline',
  density: 'spacious',
  colorMode: 'light',
  animation: 'none',
};

async function seedUsersAndSites(): Promise<void> {
  const passwordHash = await hash(DEMO_PASSWORD);

  await prisma.user.createMany({
    data: [
      { id: ID.owner, email: 'owner@lumio.app', name: 'สมชาย ใจดี', passwordHash },
      { id: ID.editor, email: 'editor@lumio.app', name: 'ปิยะดา แสงทอง', passwordHash },
    ],
  });

  await prisma.site.createMany({
    data: [
      {
        id: ID.cafeSite,
        ownerId: ID.owner,
        name: 'กาแฟบ้านดอย',
        subdomain: 'baandoi',
        localeDefault: 'th',
        locales: ['th'],
        plan: 'pro',
        templateId: CAFE_TEMPLATE_ID,
        themeTokens: CAFE_TOKENS,
        settings: {
          timezone: 'Asia/Bangkok',
          currency: 'THB',
          businessType: 'restaurant',
          styleId: 'soft',
          logoMediaId: ID.cafeLogo,
          commerce: {
            promptPayId: '0812345678',
            shippingFee: 5_000,
            freeShippingThreshold: 50_000,
            payments: { promptpay: true, cod: true },
          },
        },
      },
      {
        id: ID.clinicSite,
        ownerId: ID.owner,
        name: 'คลินิกทันตกรรมยิ้มสวย',
        subdomain: 'yimsauy',
        localeDefault: 'th',
        locales: ['th', 'en'],
        plan: 'starter',
        templateId: CLINIC_TEMPLATE_ID,
        themeTokens: CLINIC_TOKENS,
        settings: {
          timezone: 'Asia/Bangkok',
          currency: 'THB',
          businessType: 'clinic',
          styleId: 'minimal',
        },
      },
    ],
  });
}

async function seedCafe(): Promise<void> {
  await runForSite(prisma, ID.cafeSite, async (tx) => {
    await tx.siteMember.createMany({
      data: [
        { siteId: ID.cafeSite, userId: ID.owner, role: 'owner' },
        { siteId: ID.cafeSite, userId: ID.editor, role: 'editor' },
      ],
    });

    await tx.domain.createMany({
      data: [
        {
          siteId: ID.cafeSite,
          hostname: 'baandoi.lumio.app',
          isPrimary: true,
          sslStatus: 'active',
          verifiedAt: new Date(),
        },
        {
          siteId: ID.cafeSite,
          hostname: 'baandoicoffee.com',
          isPrimary: false,
          sslStatus: 'pending',
        },
      ],
    });

    await tx.media.createMany({
      data: [
        {
          id: ID.cafeLogo,
          siteId: ID.cafeSite,
          storageKey: 'baandoi/logo/logo.png',
          filename: 'logo.png',
          mime: 'image/png',
          sizeBytes: 18_432n,
          width: 512,
          height: 512,
          alt: 'โลโก้กาแฟบ้านดอย',
          folder: 'brand',
          status: 'ready',
          variants: [{ w: 96, format: 'webp', url: 'baandoi/logo/logo-96.webp' }],
        },
        {
          id: ID.cafeShop,
          siteId: ID.cafeSite,
          storageKey: 'baandoi/hero/shop.jpg',
          filename: 'shop.jpg',
          mime: 'image/jpeg',
          sizeBytes: 1_248_576n,
          width: 1920,
          height: 1080,
          alt: 'บรรยากาศหน้าร้านกาแฟบ้านดอย',
          focalPoint: { x: 0.5, y: 0.4 },
          folder: 'hero',
          status: 'ready',
          variants: [
            { w: 640, format: 'webp', url: 'baandoi/hero/shop-640.webp' },
            { w: 1280, format: 'webp', url: 'baandoi/hero/shop-1280.webp' },
          ],
        },
      ],
    });

    await tx.content.createMany({
      data: [
        {
          id: ID.cafeHome,
          siteId: ID.cafeSite,
          type: 'page',
          title: 'หน้าแรก',
          slug: 'home',
          status: 'published',
          blocksDraft: cafeHomeBlocks(),
          blocksPublished: cafeHomeBlocks(),
          excerpt: 'กาแฟคั่วสดใหม่ทุกเช้าใจกลางเชียงใหม่',
          coverMediaId: ID.cafeShop,
          authorId: ID.owner,
          seo: {
            title: 'กาแฟบ้านดอย — กาแฟคั่วสดใหม่เชียงใหม่',
            description: 'ร้านกาแฟคั่วเอง ชงมือ ใจกลางเมืองเชียงใหม่',
            noindex: false,
          },
          revision: 4,
          publishedAt: new Date('2026-09-01T02:00:00Z'),
        },
        {
          id: ID.cafeAbout,
          siteId: ID.cafeSite,
          type: 'page',
          title: 'เกี่ยวกับเรา',
          slug: 'about',
          status: 'published',
          blocksDraft: cafeAboutBlocks(),
          blocksPublished: cafeAboutBlocks(),
          authorId: ID.owner,
          seo: { title: 'เกี่ยวกับกาแฟบ้านดอย', noindex: false },
          revision: 2,
          publishedAt: new Date('2026-09-05T02:00:00Z'),
        },
        {
          id: ID.cafePost,
          siteId: ID.cafeSite,
          type: 'post',
          title: '3 วิธีเลือกเมล็ดกาแฟให้ถูกปาก',
          slug: 'how-to-pick-beans',
          status: 'published',
          blocksDraft: cafePostBlocks(),
          blocksPublished: cafePostBlocks(),
          excerpt: 'เริ่มจากดูระดับการคั่ว แล้วค่อยปรับตามรสที่ชอบ',
          authorId: ID.editor,
          seo: { title: 'เลือกเมล็ดกาแฟให้ถูกปาก', noindex: false },
          revision: 1,
          publishedAt: new Date('2026-10-01T02:00:00Z'),
        },
        {
          id: ID.cafeDraft,
          siteId: ID.cafeSite,
          type: 'page',
          title: 'โปรโมชันเดือนพฤศจิกายน',
          slug: 'promotion-november',
          status: 'draft',
          blocksDraft: blockTree(
            heading('โปรโมชันเดือนพฤศจิกายน'),
            paragraph('ซื้อ 2 แถม 1 ทุกวันพุธ'),
          ),
          authorId: ID.editor,
          seo: {},
          revision: 1,
        },
      ],
    });

    await tx.contentVersion.createMany({
      data: [
        {
          contentId: ID.cafeHome,
          siteId: ID.cafeSite,
          blocks: cafeHomeBlocks(),
          createdBy: ID.owner,
          note: 'เผยแพร่ครั้งแรก',
        },
        {
          contentId: ID.cafeHome,
          siteId: ID.cafeSite,
          blocks: cafeHomeBlocks(),
          createdBy: ID.editor,
          note: 'ปรับข้อความโปรโมชัน',
        },
        {
          contentId: ID.cafePost,
          siteId: ID.cafeSite,
          blocks: cafePostBlocks(),
          createdBy: ID.editor,
          note: 'ฉบับร่างแรก',
        },
      ],
    });

    await tx.taxonomy.createMany({
      data: [
        {
          id: ID.cafeCategory,
          siteId: ID.cafeSite,
          kind: 'category',
          name: 'ข่าวร้าน',
          slug: 'news',
        },
      ],
    });

    await tx.contentTaxonomy.createMany({
      data: [{ contentId: ID.cafePost, taxonomyId: ID.cafeCategory, siteId: ID.cafeSite }],
    });

    await tx.menu.createMany({
      data: [
        {
          id: ID.cafeHeaderMenu,
          siteId: ID.cafeSite,
          location: 'header',
          items: [
            { label: 'หน้าแรก', contentId: ID.cafeHome },
            { label: 'เกี่ยวกับเรา', contentId: ID.cafeAbout },
            { label: 'บทความ', contentId: ID.cafePost },
          ],
        },
        {
          id: ID.cafeFooterMenu,
          siteId: ID.cafeSite,
          location: 'footer',
          items: [{ label: 'นโยบายความเป็นส่วนตัว', href: '/privacy' }],
        },
      ],
    });

    await tx.globalBlock.createMany({
      data: [
        {
          id: ID.cafeHeaderBlock,
          siteId: ID.cafeSite,
          name: 'Header หลัก',
          kind: 'header',
          blocks: blockTree(heading('กาแฟบ้านดอย')),
        },
        {
          id: ID.cafeFooterBlock,
          siteId: ID.cafeSite,
          name: 'Footer หลัก',
          kind: 'footer',
          blocks: blockTree(paragraph('© 2569 กาแฟบ้านดอย', 'muted')),
        },
      ],
    });

    await tx.form.createMany({
      data: [
        {
          id: ID.cafeContactForm,
          siteId: ID.cafeSite,
          name: 'ติดต่อเรา',
          fields: [
            { name: 'name', label: 'ชื่อ', type: 'text', required: true },
            { name: 'email', label: 'อีเมล', type: 'email', required: true },
            { name: 'message', label: 'ข้อความ', type: 'textarea', required: false },
          ],
          notify: { email: ['owner@lumio.app'], lineToken: null },
          successMessage: 'ขอบคุณค่ะ เราจะติดต่อกลับภายใน 1 วันทำการ',
        },
      ],
    });

    await tx.formSubmission.createMany({
      data: [
        {
          formId: ID.cafeContactForm,
          siteId: ID.cafeSite,
          data: {
            name: 'อรุณี',
            email: 'arunee@example.com',
            message: 'จองโต๊ะ 4 คนวันเสาร์ได้ไหมคะ',
          },
          ip: '203.0.113.10',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
          status: 'new',
        },
        {
          formId: ID.cafeContactForm,
          siteId: ID.cafeSite,
          data: {
            name: 'ธนกร',
            email: 'thanakorn@example.com',
            message: 'รับจัดเลี้ยงหรือเปล่าครับ',
          },
          ip: '203.0.113.24',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)',
          status: 'read',
        },
      ],
    });

    await tx.subscriber.createMany({
      data: [
        { siteId: ID.cafeSite, email: 'arunee@example.com', status: 'active' },
        { siteId: ID.cafeSite, email: 'thanakorn@example.com', status: 'unsubscribed' },
      ],
    });

    await tx.redirect.createMany({
      data: [{ siteId: ID.cafeSite, fromPath: '/promo', toPath: '/promotion-november', code: 301 }],
    });

    await tx.siteApp.createMany({
      data: [
        { siteId: ID.cafeSite, appKey: 'seo-audit', config: { runWeekly: true }, enabled: true },
        {
          siteId: ID.cafeSite,
          appKey: 'line-notify',
          config: { token: 'demo-token' },
          enabled: false,
        },
      ],
    });

    await insertPageViews(tx, ID.cafeSite, [
      {
        path: '/',
        referrer: 'https://www.google.com/',
        country: 'TH',
        device: 'mobile',
        sessionHash: 'cafe-session-1',
      },
      {
        path: '/about',
        referrer: null,
        country: 'TH',
        device: 'desktop',
        sessionHash: 'cafe-session-2',
      },
      {
        path: '/how-to-pick-beans',
        referrer: 'https://www.facebook.com/',
        country: 'TH',
        device: 'mobile',
        sessionHash: 'cafe-session-1',
      },
    ]);

    await tx.product.createMany({
      data: [
        {
          id: ID.cafeProductBeans,
          siteId: ID.cafeSite,
          title: 'กาแฟคั่วกลางดอยช้าง 250 กรัม',
          slug: 'doichang-medium-roast-250g',
          description:
            'เมล็ดอาราบิก้าจากดอยช้าง คั่วกลาง หอมช็อกโกแลตและผลไม้แห้ง เหมาะกับเครื่องชงทุกแบบ',
          price: 35_000,
          compareAtPrice: 42_000,
          images: [ID.cafeShop],
          stock: 24,
          category: 'เมล็ดกาแฟ',
          status: 'active',
        },
        {
          id: ID.cafeProductDrip,
          siteId: ID.cafeSite,
          title: 'ชุดดริปกาแฟ 10 ซอง',
          slug: 'drip-coffee-10-packs',
          description: 'ดริปกาแฟคั่วใหม่ 10 ซอง ชงง่ายด้วยน้ำร้อน พกไปทำงานได้ทุกวัน',
          price: 25_000,
          images: [ID.cafeShop],
          stock: 40,
          category: 'ชุดพร้อมชง',
          status: 'active',
        },
        {
          id: ID.cafeProductMug,
          siteId: ID.cafeSite,
          title: 'แก้วเซรามิกบ้านดอย',
          slug: 'baandoi-ceramic-mug',
          description: 'แก้วเซรามิก handmade ขนาด 300 มล. ทรงถนัดมือ ลายจากช่างในเชียงใหม่',
          price: 29_000,
          images: [ID.cafeLogo],
          stock: null,
          category: 'ของที่ระลึก',
          status: 'active',
        },
      ],
    });

    await tx.order.create({
      data: {
        id: ID.cafeOrder,
        siteId: ID.cafeSite,
        number: 'LM-261021-AB12',
        token: 'demo-order-token-baandoi-0001',
        status: 'pending',
        paymentMethod: 'promptpay',
        customer: {
          name: 'อรุณี ใจดี',
          phone: '0891234567',
          email: 'arunee@example.com',
          address: '128 ถนนนิมมานเหมินท์',
          subdistrict: 'สุเทพ',
          district: 'เมือง',
          province: 'เชียงใหม่',
          postcode: '50200',
        },
        note: 'ฝากส่งก่อนวันศุกร์',
        subtotal: 60_000,
        shippingFee: 0,
        total: 60_000,
      },
    });

    await tx.orderItem.createMany({
      data: [
        {
          id: ID.cafeOrderItemBeans,
          orderId: ID.cafeOrder,
          siteId: ID.cafeSite,
          productId: ID.cafeProductBeans,
          title: 'กาแฟคั่วกลางดอยช้าง 250 กรัม',
          price: 35_000,
          quantity: 1,
        },
        {
          id: ID.cafeOrderItemDrip,
          orderId: ID.cafeOrder,
          siteId: ID.cafeSite,
          productId: ID.cafeProductDrip,
          title: 'ชุดดริปกาแฟ 10 ซอง',
          price: 25_000,
          quantity: 1,
        },
      ],
    });

    await tx.auditLog.createMany({
      data: [
        {
          siteId: ID.cafeSite,
          userId: ID.owner,
          action: 'site.create',
          target: ID.cafeSite,
          meta: { subdomain: 'baandoi' },
        },
        {
          siteId: ID.cafeSite,
          userId: ID.editor,
          action: 'content.publish',
          target: ID.cafePost,
          meta: { revision: 1 },
        },
      ],
    });
  });
}

async function seedClinic(): Promise<void> {
  await runForSite(prisma, ID.clinicSite, async (tx) => {
    await tx.siteMember.createMany({
      data: [
        { siteId: ID.clinicSite, userId: ID.owner, role: 'admin' },
        { siteId: ID.clinicSite, userId: ID.editor, role: 'author' },
      ],
    });

    await tx.domain.createMany({
      data: [
        {
          siteId: ID.clinicSite,
          hostname: 'yimsauy.lumio.app',
          isPrimary: true,
          sslStatus: 'active',
          verifiedAt: new Date(),
        },
      ],
    });

    await tx.media.createMany({
      data: [
        {
          id: ID.clinicTeam,
          siteId: ID.clinicSite,
          storageKey: 'yimsauy/team/team.jpg',
          filename: 'team.jpg',
          mime: 'image/jpeg',
          sizeBytes: 964_608n,
          width: 1600,
          height: 900,
          alt: 'ทีมทันตแพทย์คลินิกยิ้มสวย',
          folder: 'team',
          status: 'ready',
          variants: [{ w: 800, format: 'webp', url: 'yimsauy/team/team-800.webp' }],
        },
      ],
    });

    await tx.content.createMany({
      data: [
        {
          id: ID.clinicHome,
          siteId: ID.clinicSite,
          type: 'page',
          title: 'หน้าแรก',
          slug: 'home',
          status: 'published',
          blocksDraft: clinicHomeBlocks(),
          blocksPublished: clinicHomeBlocks(),
          coverMediaId: ID.clinicTeam,
          authorId: ID.owner,
          seo: { title: 'คลินิกทันตกรรมยิ้มสวย — ตรวจฟันฟรีครั้งแรก', noindex: false },
          revision: 1,
          publishedAt: new Date('2026-09-20T02:00:00Z'),
        },
      ],
    });

    await tx.taxonomy.createMany({
      data: [
        {
          id: ID.clinicCategory,
          siteId: ID.clinicSite,
          kind: 'category',
          name: 'บทความสุขภาพฟัน',
          slug: 'dental-care',
        },
      ],
    });

    await tx.menu.createMany({
      data: [
        {
          id: ID.clinicHeaderMenu,
          siteId: ID.clinicSite,
          location: 'header',
          items: [{ label: 'หน้าแรก', contentId: ID.clinicHome }],
        },
      ],
    });

    await tx.globalBlock.createMany({
      data: [
        {
          id: ID.clinicHeaderBlock,
          siteId: ID.clinicSite,
          name: 'Header หลัก',
          kind: 'header',
          blocks: blockTree(heading('ยิ้มสวย')),
        },
      ],
    });

    await tx.form.createMany({
      data: [
        {
          id: ID.clinicBookingForm,
          siteId: ID.clinicSite,
          name: 'จองคิวตรวจฟัน',
          fields: [
            { name: 'name', label: 'ชื่อ-นามสกุล', type: 'text', required: true },
            { name: 'phone', label: 'เบอร์โทร', type: 'tel', required: true },
            { name: 'date', label: 'วันที่สะดวก', type: 'date', required: true },
          ],
          notify: { email: ['owner@lumio.app'], lineToken: null },
          successMessage: 'รับคิวแล้ว เจ้าหน้าที่จะโทรยืนยันภายใน 2 ชั่วโมง',
        },
      ],
    });

    await tx.formSubmission.createMany({
      data: [
        {
          formId: ID.clinicBookingForm,
          siteId: ID.clinicSite,
          data: { name: 'กมลชนก', phone: '0812345678', date: '2026-11-02' },
          ip: '203.0.113.55',
          userAgent: 'Mozilla/5.0 (Linux; Android 14)',
          status: 'new',
        },
      ],
    });

    await tx.subscriber.createMany({
      data: [{ siteId: ID.clinicSite, email: 'kamolchanok@example.com', status: 'active' }],
    });

    await tx.redirect.createMany({
      data: [{ siteId: ID.clinicSite, fromPath: '/booking', toPath: '/home', code: 302 }],
    });

    await tx.siteApp.createMany({
      data: [
        {
          siteId: ID.clinicSite,
          appKey: 'line-notify',
          config: { token: 'demo-token' },
          enabled: true,
        },
      ],
    });

    await insertPageViews(tx, ID.clinicSite, [
      {
        path: '/',
        referrer: 'https://www.google.com/',
        country: 'TH',
        device: 'mobile',
        sessionHash: 'clinic-session-1',
      },
    ]);

    await tx.auditLog.createMany({
      data: [
        {
          siteId: ID.clinicSite,
          userId: ID.owner,
          action: 'site.create',
          target: ID.clinicSite,
          meta: { subdomain: 'yimsauy' },
        },
      ],
    });
  });
}

async function main(): Promise<void> {
  await reset();
  await seedUsersAndSites();
  await seedCafe();
  await seedClinic();
  console.info('Seed complete: 2 sites (กาแฟบ้านดอย, คลินิกทันยิ้มสวย) with demo content');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
