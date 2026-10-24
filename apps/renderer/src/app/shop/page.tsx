import type { Metadata } from 'next';
import { formatBaht } from '@lumio/shared';
import { ShopShell } from '../../components/ShopShell';
import { requestHost } from '../../lib/request-host';
import { requestLocale } from '../../lib/request-locale';
import { loadShop } from '../../lib/shop';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const host = await requestHost();
  const locale = await requestLocale();
  const { site } = await loadShop(host, locale);
  return {
    title: 'สินค้าทั้งหมด',
    description: 'เลือกซื้อสินค้าจากร้านของเรา',
    alternates: { canonical: '/shop' },
    ...(site.faviconUrl ? { icons: { icon: site.faviconUrl } } : {}),
  };
}

export interface ShopPageProps {
  searchParams: Promise<{ category?: string }>;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const host = await requestHost();
  const locale = await requestLocale();
  const { category } = await searchParams;
  const shop = await loadShop(host, locale);

  const products = category
    ? shop.products.filter((product) => product.category === category)
    : shop.products;

  return (
    <ShopShell chrome={shop} path="/shop">
      <header className="shop-hero">
        <h1 className="shop-hero__title">สินค้าของร้าน</h1>
        <p className="shop-hero__subtitle">
          สั่งซื้อออนไลน์ จัดส่งทั่วประเทศ ·{' '}
          {shop.settings.freeShippingThreshold === null
            ? `ค่าจัดส่ง ${formatBaht(shop.settings.shippingFee)} บาท`
            : `ส่งฟรีเมื่อซื้อครบ ${formatBaht(shop.settings.freeShippingThreshold)} บาท`}
        </p>
      </header>

      {shop.categories.length > 0 ? (
        <nav className="shop-categories" aria-label="หมวดหมู่สินค้า">
          <a className="shop-chip" href="/shop" aria-current={category ? undefined : 'page'}>
            ทั้งหมด
          </a>
          {shop.categories.map((name) => (
            <a
              className="shop-chip"
              href={`/shop?category=${encodeURIComponent(name)}`}
              aria-current={category === name ? 'page' : undefined}
              key={name}
            >
              {name}
            </a>
          ))}
        </nav>
      ) : null}

      {products.length === 0 ? (
        <p className="shop-empty">ยังไม่มีสินค้าในหมวดนี้</p>
      ) : (
        <ul className="shop-grid">
          {products.map((product) => (
            <li className="shop-card" key={product.id}>
              <a className="shop-card__link" href={`/shop/${product.slug}`}>
                {product.images[0] ? (
                  <img
                    className="shop-card__image"
                    src={product.images[0]}
                    alt={product.title}
                    width={640}
                    height={480}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <span className="shop-card__image shop-card__image--empty" aria-hidden="true">
                    🛍
                  </span>
                )}
                <h2 className="shop-card__title">{product.title}</h2>
                <p className="shop-card__price">
                  <span>{formatBaht(product.price)} บาท</span>
                  {product.compareAtPrice ? (
                    <s className="shop-card__compare">{formatBaht(product.compareAtPrice)}</s>
                  ) : null}
                </p>
                {!product.inStock ? <p className="shop-card__soldout">สินค้าหมด</p> : null}
              </a>
              {product.inStock ? (
                <form className="shop-card__form" action="/cart/add" method="post">
                  <input type="hidden" name="productId" value={product.id} />
                  <input type="hidden" name="quantity" value="1" />
                  <input type="hidden" name="next" value="/shop" />
                  <button className="shop-button shop-button--small" type="submit">
                    เพิ่มลงตะกร้า
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </ShopShell>
  );
}
