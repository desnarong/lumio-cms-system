'use client';

import { useState } from 'react';

export interface ProductGalleryProps {
  images: string[];
  title: string;
}

/**
 * The shop's picture viewer: a vertical thumbnail rail beside a large image.
 * Keeping it client-side means a thumbnail switches the picture without a page
 * load, and the door to the full-size file stays a plain link.
 */
export const ProductGallery = ({ images, title }: ProductGalleryProps) => {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="shop-product__gallery">
        <span className="shop-product__image shop-product__image--empty" aria-hidden="true">
          🛍
        </span>
      </div>
    );
  }

  const current = images[Math.min(active, images.length - 1)] ?? images[0] ?? '';

  return (
    <div className="shop-product__gallery">
      {images.length > 1 ? (
        <ul className="shop-product__thumbs">
          {images.map((src, index) => (
            <li key={`${src}-${index}`}>
              <button
                type="button"
                className={`shop-product__thumb${
                  index === active ? ' shop-product__thumb--active' : ''
                }`}
                aria-label={`ดูรูปที่ ${index + 1}`}
                aria-current={index === active ? 'true' : undefined}
                onClick={() => setActive(index)}
              >
                <img src={src} alt="" width={160} height={120} loading="lazy" decoding="async" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <a
        className="shop-product__main-image"
        href={current}
        target="_blank"
        rel="noreferrer"
        aria-label={`ดูรูป ${title} ขนาดเต็ม`}
      >
        <img
          className="shop-product__image"
          src={current}
          alt={title}
          width={640}
          height={480}
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
      </a>
    </div>
  );
};
