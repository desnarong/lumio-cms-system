import { cn } from '@lumio/ui/cn';

export type ImageAspect = 'auto' | 'square' | 'wide' | 'photo' | 'video';

export interface ImgProps {
  /** Resolved media URL. When absent a neutral placeholder keeps the layout stable. */
  src?: string;
  srcSet?: string;
  /**
   * AVIF ladder from the media pipeline. It cannot share `srcSet` because a
   * browser needs a `<source type>` to pick a format; the WebP set stays as the
   * fallback for everything that cannot decode AVIF.
   */
  avifSrcSet?: string;
  /**
   * Point of the image that must stay visible when the block crops it (0-1).
   * Rendered as `object-position`, so no re-cropped file is needed.
   */
  focalPoint?: { x: number; y: number };
  sizes?: string;
  /** Required: every image must describe itself for screen readers. */
  alt: string;
  width?: number;
  height?: number;
  aspect?: ImageAspect;
  /** Hero/above-the-fold images load eagerly, everything else stays lazy. */
  priority?: boolean;
  className?: string;
}

const DEFAULT_SIZES = '(min-width: 1024px) 1024px, 100vw';

/** The only image component blocks may use: lazy by default, always with an alt text. */
export const Img = ({
  src,
  srcSet,
  avifSrcSet,
  focalPoint,
  sizes,
  alt,
  width,
  height,
  aspect = 'auto',
  priority = false,
  className,
}: ImgProps) => {
  const wrapperClass = cn('lumio-img', `lumio-img--${aspect}`, className);

  if (!src) {
    return (
      <span
        className={cn(wrapperClass, 'lumio-img--placeholder')}
        role="img"
        aria-label={alt}
        data-placeholder="true"
      />
    );
  }

  const fallback = (
    <img
      className="lumio-img__element"
      src={src}
      srcSet={srcSet}
      sizes={srcSet ? (sizes ?? DEFAULT_SIZES) : sizes}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      style={
        focalPoint
          ? { objectPosition: `${Math.round(focalPoint.x * 100)}% ${Math.round(focalPoint.y * 100)}%` }
          : undefined
      }
    />
  );

  return (
    <span className={wrapperClass}>
      {avifSrcSet ? (
        <picture className="lumio-img__picture">
          <source type="image/avif" srcSet={avifSrcSet} sizes={sizes ?? DEFAULT_SIZES} />
          {fallback}
        </picture>
      ) : (
        fallback
      )}
    </span>
  );
};
