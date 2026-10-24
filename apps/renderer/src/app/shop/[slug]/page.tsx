import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { formatBaht } from '@lumio/shared';
import { JsonLd } from '../../../components/JsonLd';
import { ShopShell } from '../../../components/ShopShell';
import { requestHost } from '../../../lib/request-host';
import { requestLocale } from '../../../lib/request-locale';
import { loadShopProductOrNull } from '../../../lib/shop';
import { reportNotFound } from '../../../lib/not-found';

export const revalidate = 60;

export interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const host = await requestHost();
  const locale = await requestLocale();
  const { slug } = await params;
  const shop = await loadShopProductOrNull(host, slug, locale);
  if (!shop) return { title: 'ไม่พบสินค้านี้' };
  return {
    title: shop.product.title,
    description: shop.product.description.slice(0, 160),
    alternates: { canonical: `/shop/${shop.product.slug}` },
    openGraph: shop.product.images[0] ? { images: [shop.product.images[0]] } : undefined,
    ...(shop.site.faviconUrl ? { icons: { icon: shop.site.faviconUrl } } : {}),
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const host = await requestHost();
  const locale = await requestLocale();
  const { slug } = await params;
  const shop = await loadShopProductOrNull(host, slug, locale);
  if (!shop) {
    await reportNotFound(host, `/shop/${slug}`);
    notFound();
  }

  const { product } = shop;
  const freeShipping =
    shop.settings.freeShippingThreshold === null
      ? null
      : shop.settings.freeShippingThreshold;

  return (
    <ShopShell chrome={shop} path={`/shop/${product.slug}`}>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.title,
          description: product.description,
          sku: product.id,
          ...(product.images[0] ? { image: [product.images[0]] } : {}),
          offers: {
            '@type': 'Offer',
            priceCurrency: product.currency,
            price: (product.price / 100).toFixed(2),
            availability: product.inStock
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
            url: `/shop/${product.slug}`,
          },
        }}
      />
      <nav className="shop-breadcrumb" aria-label="เส้นทางนำทาง">
        <a href="/shop">สินค้าทั้งหมด</a>
        {product.category ? <span aria-hidden="true"> · </span> : null}
        {product.category ? (
          <a href={`/shop?category=${encodeURIComponent(product.category)}`}>{product.category}</a>
        ) : null}
      </nav>

      <div className="shop-product">
        <div className="shop-product__gallery">
          {product.images[0] ? (
            <>
              <a
                className="shop-product__main-image"
                href={product.images[0]}
                target="_blank"
                rel="noreferrer"
                aria-label={`ดูรูป ${product.title} ขนาดเต็ม`}
              >
                <img
                  className="shop-product__image"
                  src={product.images[0]}
                  alt={product.title}
                  width={640}
                  height={480}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                />
              </a>
              {product.images.length > 1 ? (
                <ul className="shop-product__thumbs">
                  {product.images.slice(1).map((src, index) => (
                    <li key={src}>
                      <a href={src} target="_blank" rel="noreferrer">
                        <img
                          className="shop-product__thumb"
                          src={src}
                          alt={`${product.title} รูปที่ ${index + 2}`}
                          width={160}
                          height={120}
                          loading="lazy"
                          decoding="async"
                        />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : (
            <span className="shop-product__image shop-product__image--empty" aria-hidden="true">
              🛍
            </span>
          )}
        </div>

        <div className="shop-product__info">
          <h1 className="shop-product__title">{product.title}</h1>
          <p className="shop-product__price">
            <span>{formatBaht(product.price)} บาท</span>
            {product.compareAtPrice ? (
              <s className="shop-product__compare">{formatBaht(product.compareAtPrice)} บาท</s>
            ) : null}
          </p>

          {product.inStock ? (
            <form className="shop-buy" action="/cart/add" method="post">
              <input type="hidden" name="productId" value={product.id} />
              <input type="hidden" name="next" value={`/shop/${product.slug}`} />
              {product.options.length > 0 ? (
                <label className="shop-buy__label" htmlFor="product-variant">
                  เลือก{product.options.map((option) => option.name).join(' / ')}
                  <select
                    className="shop-buy__variant"
                    id="product-variant"
                    name="variantId"
                    required
                    defaultValue=""
                  >
                    <option value="" disabled>
                      เลือกตัวเลือก
                    </option>
                    {product.variants.map((variant) => (
                      <option value={variant.id} key={variant.id} disabled={!variant.inStock}>
                        {variant.label} · {formatBaht(variant.price)} บาท
                        {variant.inStock ? '' : ' (หมด)'}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="shop-buy__label" htmlFor="product-quantity">
                จำนวน
              </label>
              <input
                className="shop-buy__quantity"
                id="product-quantity"
                name="quantity"
                type="number"
                min={1}
                max={99}
                defaultValue={1}
                inputMode="numeric"
              />
              <button className="shop-button" type="submit">
                เพิ่มลงตะกร้า
              </button>
            </form>
          ) : (
            <p className="shop-product__soldout">สินค้าหมด — ติดต่อร้านเพื่อสอบถามรอบถัดไป</p>
          )}

          <ul className="shop-product__facts">
            {product.stock !== null ? <li>เหลือ {product.stock} ชิ้น</li> : null}
            {freeShipping !== null ? (
              <li>ส่งฟรีเมื่อซื้อครบ {formatBaht(freeShipping)} บาท</li>
            ) : null}
            <li>
              ค่าจัดส่ง {formatBaht(shop.settings.shippingFee)} บาท · ชำระผ่านพร้อมเพย์หรือเก็บเงินปลายทาง
            </li>
          </ul>

          {product.description ? (
            <div className="shop-product__description">
              {product.description.split('\n').map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {product.specs.length > 0 ? (
        <section className="shop-specs" aria-labelledby="spec-heading">
          <h2 className="shop-section-title" id="spec-heading">
            ข้อมูลผลิตภัณฑ์
          </h2>
          <dl className="shop-specs__list">
            {product.specs.map((row) => (
              <div className="shop-specs__row" key={`${row.label}-${row.value}`}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {shop.related.length > 0 ? (
        <section className="shop-related" aria-labelledby="related-heading">
          <h2 className="shop-section-title" id="related-heading">
            สินค้าที่คล้ายกัน
          </h2>
          <ul className="shop-grid">
            {shop.related.map((item) => (
              <li className="shop-card" key={item.id}>
                <a className="shop-card__link" href={`/shop/${item.slug}`}>
                  {item.images[0] ? (
                    <img
                      className="shop-card__image"
                      src={item.images[0]}
                      alt={item.title}
                      width={640}
                      height={480}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : null}
                  <h3 className="shop-card__title">{item.title}</h3>
                  <p className="shop-card__price">{formatBaht(item.price)} บาท</p>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </ShopShell>
  );
}
