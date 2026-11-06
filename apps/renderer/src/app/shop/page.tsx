import type { Metadata } from 'next';
import { formatBaht } from '@lumio/shared';
import { money, storefrontT } from '../../lib/messages';
import { ShopShell } from '../../components/ShopShell';
import { requestHost } from '../../lib/request-host';
import { requestLocale } from '../../lib/request-locale';
import { loadShop } from '../../lib/shop';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const host = await requestHost();
  const locale = await requestLocale();
  const { site } = await loadShop(host, locale);
  const t = storefrontT(locale);
  return {
    title: t('shop.metaTitle'),
    description: t('shop.metaDescription'),
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
  const t = storefrontT(locale);
  const { category } = await searchParams;
  const shop = await loadShop(host, locale);

  const products = category
    ? shop.products.filter((product) => product.category === category)
    : shop.products;

  return (
    <ShopShell chrome={shop} locale={locale} path="/shop">
      <header className="shop-hero">
        <h1 className="shop-hero__title">{t('shop.title')}</h1>
        <p className="shop-hero__subtitle">
          {t('shop.subtitle')} ·{' '}
          {shop.settings.freeShippingThreshold === null
            ? t('shop.shippingFee', { amount: formatBaht(shop.settings.shippingFee) })
            : t('shop.freeShippingOver', {
                amount: formatBaht(shop.settings.freeShippingThreshold),
              })}
        </p>
      </header>

      {shop.categories.length > 0 ? (
        <nav className="shop-categories" aria-label={t('shop.categories')}>
          <a className="shop-chip" href="/shop" aria-current={category ? undefined : 'page'}>
            {t('shop.all')}
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
        <p className="shop-empty">{t('shop.emptyCategory')}</p>
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
                  <span>{money(t, product.price)}</span>
                  {product.compareAtPrice ? (
                    <s className="shop-card__compare">{formatBaht(product.compareAtPrice)}</s>
                  ) : null}
                </p>
                {!product.inStock ? (
                  <p className="shop-card__soldout">{t('shop.soldOut')}</p>
                ) : null}
              </a>
              {product.inStock ? (
                <form className="shop-card__form" action="/cart/add" method="post">
                  <input type="hidden" name="productId" value={product.id} />
                  <input type="hidden" name="quantity" value="1" />
                  <input type="hidden" name="next" value="/shop" />
                  <button className="shop-button shop-button--small" type="submit">
                    {t('shop.addToCart')}
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
