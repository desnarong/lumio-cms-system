import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { formatBaht } from '@lumio/shared';
import { JsonLd } from '../../../components/JsonLd';
import { ProductGallery } from '../../../components/ProductGallery';
import { QuantityStepper } from '../../../components/QuantityStepper';
import { ShopShell } from '../../../components/ShopShell';
import { requestHost } from '../../../lib/request-host';
import { requestLocale } from '../../../lib/request-locale';
import { loadShopProductOrNull } from '../../../lib/shop';
import { reportNotFound } from '../../../lib/not-found';
import { productCopyBlocks } from '../../../lib/product-copy';
import { ratingLabel, starFills } from '../../../lib/rating';

export const revalidate = 60;

export interface ProductPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ variant?: string; quantity?: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const host = await requestHost();
  const locale = await requestLocale();
  const { slug } = await params;
  const shop = await loadShopProductOrNull(host, slug, locale);
  if (!shop) return { title: 'ไม่พบสินค้านี้' };
  return {
    title: shop.product.title,
    description: (shop.product.summary || shop.product.description).slice(0, 160),
    alternates: { canonical: `/shop/${shop.product.slug}` },
    openGraph: shop.product.images[0] ? { images: [shop.product.images[0]] } : undefined,
    ...(shop.site.faviconUrl ? { icons: { icon: shop.site.faviconUrl } } : {}),
  };
}

export default async function ProductPage({ params, searchParams }: ProductPageProps) {
  const host = await requestHost();
  const locale = await requestLocale();
  const { slug } = await params;
  const { variant, quantity } = await searchParams;
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
  const fills = starFills(product.rating);
  const copy = productCopyBlocks(product.description);
  const presetVariant =
    typeof variant === 'string' && product.variants.some((entry) => entry.id === variant)
      ? variant
      : undefined;
  const requestedQuantity = Number(quantity);
  const maxQuantity = Math.min(99, product.stock === null ? 99 : Math.max(1, product.stock));
  const presetQuantity = Number.isFinite(requestedQuantity)
    ? Math.min(maxQuantity, Math.max(1, Math.trunc(requestedQuantity)))
    : 1;

  return (
    <ShopShell chrome={shop} path={`/shop/${product.slug}`}>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.title,
          description: product.summary || product.description,
          sku: product.id,
          ...(product.images[0] ? { image: product.images } : {}),
          ...(product.rating !== null && product.ratingCount > 0
            ? {
                aggregateRating: {
                  '@type': 'AggregateRating',
                  ratingValue: product.rating,
                  reviewCount: product.ratingCount,
                },
              }
            : {}),
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
        <ProductGallery images={product.images} title={product.title} />

        <div className="shop-product__info">
          <h1 className="shop-product__title">{product.title}</h1>
          {product.tagline ? (
            <p className="shop-product__tagline">
              <span aria-hidden="true">💡</span> {product.tagline}
            </p>
          ) : null}
          {product.summary ? <p className="shop-product__summary">{product.summary}</p> : null}

          {product.rating !== null ? (
            <p className="shop-rating">
              <span
                className="shop-rating__stars"
                role="img"
                aria-label={ratingLabel(product.rating, product.ratingCount)}
              >
                {fills.map((fill, index) => (
                  <span
                    key={index}
                    className={`shop-rating__star shop-rating__star--${fill}`}
                    aria-hidden="true"
                  >
                    ★
                  </span>
                ))}
              </span>
              <span className="shop-rating__score">{product.rating.toFixed(1)}</span>
              {product.ratingCount > 0 ? (
                <span className="shop-rating__count">
                  ({product.ratingCount.toLocaleString('th-TH')} รีวิว)
                </span>
              ) : null}
            </p>
          ) : null}

          <p className="shop-product__price">
            <span>{formatBaht(product.price)} บาท</span>
            {product.compareAtPrice ? (
              <s className="shop-product__compare">{formatBaht(product.compareAtPrice)} บาท</s>
            ) : null}
          </p>

          {product.inStock ? (
            <form className="shop-buy" action="/cart/add" method="post">
              <input type="hidden" name="productId" value={product.id} />
              {product.options.length > 0 ? (
                <label className="shop-buy__label" htmlFor="product-variant">
                  เลือก{product.options.map((option) => option.name).join(' / ')}
                  <select
                    className="shop-buy__variant"
                    id="product-variant"
                    name="variantId"
                    required
                    defaultValue={presetVariant ?? ''}
                  >
                    <option value="" disabled>
                      เลือกตัวเลือก
                    </option>
                    {product.variants.map((entry) => (
                      <option value={entry.id} key={entry.id} disabled={!entry.inStock}>
                        {entry.label} · {formatBaht(entry.price)} บาท
                        {entry.inStock ? '' : ' (หมด)'}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <div className="shop-buy__quantity-row">
                <label className="shop-buy__label" htmlFor="product-quantity">
                  จำนวนสินค้า
                </label>
                <QuantityStepper
                  id="product-quantity"
                  name="quantity"
                  defaultValue={presetQuantity}
                  max={maxQuantity}
                />
              </div>
              <div className="shop-buy__actions">
                <button
                  className="shop-button shop-buy__add"
                  type="submit"
                  name="next"
                  value={`/shop/${product.slug}`}
                >
                  เพิ่มสินค้าลงตะกร้า
                </button>
                <button
                  className="shop-button shop-buy__now"
                  type="submit"
                  name="next"
                  value="/checkout"
                >
                  ซื้อเลย
                </button>
              </div>
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

      {copy.length > 0 ? (
        <section className="shop-description" aria-labelledby="description-heading">
          <h2 className="shop-section-title" id="description-heading">
            รายละเอียดสินค้า
          </h2>
          <div className="shop-description__body">
            {copy.map((block, index) =>
              block.type === 'list' ? (
                <ul className="shop-description__bullets" key={`list-${index}`}>
                  {block.items.map((item, itemIndex) => (
                    <li key={itemIndex}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p key={`p-${index}`}>{block.text}</p>
              ),
            )}
          </div>
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
