/** One readable block of a product description. */
export type ProductCopyBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] };

/** Bullet markers sellers paste in from marketplaces, e.g. "• หลอดไฟประหยัดพลังงาน". */
const BULLET = /^[•●·▪‣*–—-]\s*/;

/**
 * Turns a pasted product description into paragraphs and bullet lists, so the
 * long copy keeps its structure instead of becoming one wall of text
 * (the product page in docs/design/03-scope.md 3.3).
 */
export const productCopyBlocks = (text: string): ProductCopyBlock[] => {
  const blocks: ProductCopyBlock[] = [];
  let paragraph: string[] = [];
  let items: string[] = [];

  const flushParagraph = (): void => {
    const joined = paragraph.join(' ').trim();
    if (joined.length > 0) blocks.push({ type: 'paragraph', text: joined });
    paragraph = [];
  };

  const flushItems = (): void => {
    if (items.length > 0) blocks.push({ type: 'list', items });
    items = [];
  };

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line.length === 0) {
      flushParagraph();
      flushItems();
      continue;
    }
    if (BULLET.test(line)) {
      flushParagraph();
      items.push(line.replace(BULLET, '').trim());
      continue;
    }
    flushItems();
    paragraph.push(line);
  }

  flushParagraph();
  flushItems();
  return blocks;
};
