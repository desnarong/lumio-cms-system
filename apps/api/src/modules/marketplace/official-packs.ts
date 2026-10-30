import {
  defaultBlockStyle,
  marketplacePackSchema,
  type BlockNode,
  type BuiltinBlockType,
  type MarketplacePack,
} from '@lumio/shared';

/**
 * Packs that ship with Lumio and need no signature: they are part of this build,
 * exactly like the templates in `templates/`. A vendor pack must be signed with
 * the marketplace key instead (marketplace.service.ts).
 *
 * Every section uses only blocks from `BUILTIN_BLOCK_TYPES`, so installing or
 * removing a pack can never leave a page referencing a block type that does not
 * exist. Copy is real Thai so a new site starts from something readable.
 */

const node = (
  id: string,
  type: BuiltinBlockType,
  props: Record<string, unknown>,
  style: Partial<typeof defaultBlockStyle> = {},
): BlockNode => ({
  id,
  type,
  version: 1,
  props,
  style: { ...defaultBlockStyle, ...style },
  children: [],
});

const pack = (value: unknown): MarketplacePack => marketplacePackSchema.parse(value);

export const OFFICIAL_PACKS: readonly MarketplacePack[] = [
  pack({
    v: 1,
    key: 'lumio-launch',
    name: 'ชุดเปิดตัวเว็บ',
    nameEn: 'Website launch pack',
    description: 'หน้าแรกพร้อมใช้: ส่วนต้อนรับ จุดเด่น และปุ่มพาไปหน้าถัดไป',
    descriptionEn: 'A ready home page: hero, three selling points and a call to action',
    version: '1.1.0',
    author: 'Lumio',
    license: 'CC BY 4.0',
    sections: [
      {
        name: 'หน้าแรกพร้อมใช้',
        nameEn: 'Ready home page',
        description: 'ส่วนต้อนรับ จุดเด่นสามข้อ และปุ่มชวนลูกค้า',
        descriptionEn: 'Hero, three selling points and a call to action',
        blocks: [
          node(
            'launch-0-0',
            'hero',
            {
              layout: 'centered',
              headingSize: 'lg',
              contentWidth: 'wide',
              heading: 'เริ่มต้นเว็บไซต์ที่ลูกค้าจำได้',
              subheading:
                'เล่าเรื่องธุรกิจของคุณให้ชัดในหน้าแรก แล้วพาลูกค้าไปยังสิ่งที่ต้องการในคลิกเดียว',
              note: '',
              buttons: [
                { label: 'พูดคุยกับเรา', href: '/contact', variant: 'primary', external: false },
              ],
              contentAlign: 'center',
            },
            { paddingY: 'xl' },
          ),
          node('launch-0-1', 'features', {
            heading: 'ทำไมลูกค้าถึงเลือกเรา',
            subheading: 'สามสิ่งที่ทำให้ทุกครั้งที่ติดต่อเราง่ายและไว้ใจได้',
            columns: '3',
            items: [
              {
                title: 'ตอบไว',
                description: 'ตอบทุกข้อความภายในหนึ่งวันทำการ ไม่ปล่อยให้ลูกค้ารอ',
                iconName: 'clock',
              },
              {
                title: 'งานละเอียด',
                description: 'ตรวจงานทุกชิ้นก่อนส่งถึงมือลูกค้า',
                iconName: 'check',
              },
              {
                title: 'ดูแลต่อเนื่อง',
                description: 'ให้คำปรึกษาหลังส่งงาน ไม่ทิ้งกันกลางทาง',
                iconName: 'users',
              },
            ],
          }),
          node('launch-0-2', 'button', {
            label: 'ดูบริการทั้งหมด',
            href: '/services',
            variant: 'secondary',
            align: 'center',
          }),
        ],
      },
      {
        name: 'ส่วนติดต่อเรา',
        nameEn: 'Contact block',
        description: 'ชวนลูกค้าติดต่อพร้อมข้อมูลที่ควรบอกก่อน',
        descriptionEn: 'Invites the visitor to get in touch',
        blocks: [
          node('launch-1-0', 'heading', {
            text: 'พร้อมคุยกับเราแล้วหรือยัง',
            level: 'h2',
            align: 'center',
          }),
          node('launch-1-1', 'paragraph', {
            text: 'ส่งข้อความเล่าโจทย์ของคุณมาได้เลย ทีมงานจะตอบกลับพร้อมขั้นตอนถัดไปภายในหนึ่งวันทำการ',
            align: 'center',
          }),
          node('launch-1-2', 'button', {
            label: 'ส่งข้อความ',
            href: '/contact',
            variant: 'primary',
            align: 'center',
          }),
        ],
      },
    ],
  }),

  pack({
    v: 1,
    key: 'lumio-story',
    name: 'ชุดเรื่องราวธุรกิจ',
    nameEn: 'Business story pack',
    description: 'เล่าเรื่องที่มาของธุรกิจและทีมงาน ให้ลูกค้าเห็นว่าคุณเป็นใคร',
    descriptionEn: 'Tells where the business comes from and who is behind it',
    version: '1.0.0',
    author: 'Lumio',
    license: 'CC BY 4.0',
    sections: [
      {
        name: 'เรื่องราวของเรา',
        nameEn: 'Our story',
        description: 'หัวข้อ ย่อหน้า และรูปภาพสำหรับเล่าเรื่องที่มา',
        descriptionEn: 'Heading, paragraph and picture for the origin story',
        blocks: [
          node('story-0-0', 'heading', { text: 'เรื่องราวของเรา', level: 'h2' }),
          node('story-0-1', 'paragraph', {
            text: 'เราเริ่มจากคำถามง่าย ๆ ว่า ทำอย่างไรให้ลูกค้าได้สิ่งที่ต้องการโดยไม่ต้องอธิบายซ้ำหลายรอบ ทุกวันนี้งานทุกชิ้นจึงเริ่มจากการฟังให้จบก่อนลงมือทำ',
            size: 'lg',
          }),
          node(
            'story-0-2',
            'image',
            {
              caption: 'ทีมงานระหว่างทำงาน',
              aspect: 'wide',
            },
            { paddingY: 'sm' },
          ),
        ],
      },
      {
        name: 'ทีมงานของเรา',
        nameEn: 'Our team',
        blocks: [
          node('story-1-0', 'heading', { text: 'คนที่อยู่เบื้องหลังงานทุกชิ้น', level: 'h2' }),
          node('story-1-1', 'paragraph', {
            text: 'ทีมเล็กที่ทำงานกันใกล้ชิด ทุกคนดูแลงานตั้งแต่ต้นจนจบ',
          }),
          node('story-1-2', 'features', {
            heading: '',
            subheading: '',
            columns: '3',
            items: [
              {
                title: 'ฝ่ายออกแบบ',
                description: 'ดูแลหน้าตาและลำดับการอ่านของเว็บ',
                iconName: 'star',
              },
              {
                title: 'ฝ่ายเนื้อหา',
                description: 'ช่วยเรียบเรียงข้อความให้ลูกค้าอ่านรู้เรื่อง',
                iconName: 'book',
              },
              {
                title: 'ฝ่ายดูแล',
                description: 'ตอบคำถามและดูแลระบบหลังบ้านให้ทุกวัน',
                iconName: 'settings',
              },
            ],
          }),
        ],
      },
    ],
  }),

  pack({
    v: 1,
    key: 'lumio-blog-home',
    name: 'ชุดหน้าบทความ',
    nameEn: 'Blog home pack',
    description: 'หน้าแรกของบทความ: หัวข้อและรายการบทความล่าสุดที่อัปเดตเอง',
    descriptionEn: 'A blog landing page with the latest posts, updated automatically',
    version: '1.2.0',
    author: 'Lumio',
    license: 'CC BY 4.0',
    sections: [
      {
        name: 'หน้าบทความล่าสุด',
        nameEn: 'Latest posts page',
        blocks: [
          node('blog-0-0', 'heading', { text: 'บทความล่าสุด', level: 'h2' }),
          node('blog-0-1', 'paragraph', {
            text: 'เรื่องราว ความรู้ และข่าวสารจากทีมของเรา อัปเดตใหม่ทุกสัปดาห์',
          }),
          node('blog-0-2', 'posts', {
            heading: '',
            subheading: '',
            columns: '3',
            source: 'latest',
            sourceLimit: 3,
          }),
        ],
      },
    ],
  }),

  pack({
    v: 1,
    key: 'lumio-shop-front',
    name: 'ชุดหน้าร้าน',
    nameEn: 'Shop front pack',
    description: 'โชว์สินค้าจากหน้าร้านจริง พร้อมส่วนชวนกดดูสินค้า',
    descriptionEn: 'Shows the real shop catalogue with a call to action',
    version: '1.1.0',
    author: 'Lumio',
    license: 'CC BY 4.0',
    sections: [
      {
        name: 'สินค้าแนะนำจากร้าน',
        nameEn: 'Shop picks',
        blocks: [
          node('shop-0-0', 'heading', { text: 'สินค้าแนะนำ', level: 'h2' }),
          node('shop-0-1', 'paragraph', {
            text: 'เลือกจากสินค้าขายดีของร้าน สั่งซื้อได้ทันทีจากหน้านี้',
          }),
          node('shop-0-2', 'products', {
            heading: '',
            subheading: '',
            columns: '3',
            source: 'shop',
            sourceLimit: 6,
          }),
          node('shop-0-3', 'button', {
            label: 'ไปที่หน้าร้าน',
            href: '/shop',
            align: 'center',
          }),
        ],
      },
    ],
  }),
];

export const findOfficialPack = (key: string): MarketplacePack | undefined =>
  OFFICIAL_PACKS.find((entry) => entry.key === key);
