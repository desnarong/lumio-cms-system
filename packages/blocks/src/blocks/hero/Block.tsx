import type { CSSProperties } from 'react';
import type { BlockNode } from '@lumio/shared';
import { Editable } from '../../engine/editable.js';
import { Img } from '../../engine/img.js';
import type { BlockRenderProps } from '../../types.js';
import { floatWidthPercent, floatXPercent, floatYPercent, type HeroProps } from './schema.js';

const HeroContent = ({ props, block }: { props: HeroProps; block: BlockNode }) => (
  <div className="lumio-hero__content">
    <Editable
      as="h1"
      path="props.heading"
      value={props.heading}
      runs={block.textStyles?.['props.heading']}
      layout={block.textLayouts?.['props.heading']}
      className="lumio-hero__heading"
      label="หัวข้อหลัก"
    />
    <Editable
      as="p"
      multiline
      path="props.subheading"
      value={props.subheading}
      runs={block.textStyles?.['props.subheading']}
      layout={block.textLayouts?.['props.subheading']}
      className="lumio-hero__subheading"
      label="คำอธิบายใต้หัวข้อ"
    />
    <Editable
      as="p"
      multiline
      path="props.note"
      value={props.note}
      runs={block.textStyles?.['props.note']}
      layout={block.textLayouts?.['props.note']}
      className="lumio-hero__note"
      label="ข้อความเพิ่มเติมใต้คำอธิบาย"
    />
    {props.buttons.length > 0 ? (
      <div className="lumio-hero__actions">
        {props.buttons.map((button, index) => (
          <a
            key={index}
            className={`ui-button ui-button--${button.variant} ui-button--lg`}
            href={button.href.length > 0 ? button.href : '#'}
            target={button.external ? '_blank' : undefined}
            rel={button.external ? 'noopener noreferrer' : undefined}
          >
            <Editable
              path={`props.buttons.${index}.label`}
              value={button.label}
              runs={block.textStyles?.[`props.buttons.${index}.label`]}
              layout={block.textLayouts?.[`props.buttons.${index}.label`]}
              label="ข้อความปุ่ม"
            />
          </a>
        ))}
      </div>
    ) : null}
  </div>
);

interface PictureProps {
  image: HeroProps['image'];
  hoverImage?: HeroProps['hoverImage'];
  className: string;
  /** Layout width of the picture, so the browser picks a sharp enough file. */
  sizes: string;
}

const Picture = ({ image, hoverImage, className, sizes }: PictureProps) => (
  <div className={className}>
    <Img
      src={image?.src}
      srcSet={image?.srcSet}
      avifSrcSet={image?.avifSrcSet}
      focalPoint={image?.focalPoint}
      width={image?.width}
      height={image?.height}
      alt={image?.alt ?? ''}
      aspect="wide"
      sizes={sizes}
      priority
    />
    {hoverImage?.src ? (
      <Img
        className="lumio-hero__image-hover"
        src={hoverImage.src}
        srcSet={hoverImage.srcSet}
        avifSrcSet={hoverImage.avifSrcSet}
        focalPoint={hoverImage.focalPoint}
        width={hoverImage.width}
        height={hoverImage.height}
        alt=""
        aspect="wide"
        sizes={sizes}
      />
    ) : null}
  </div>
);

/**
 * Product cut-outs painted above the banner. They are absolute, positioned as a
 * share of the hero, so the same list works on the full-bleed overlay and on the
 * split layouts.
 */
const HeroFloats = ({ items }: { items: HeroProps['foregrounds'] }) => (
  <>
    {items.map((item, index) =>
      item.image && floatWidthPercent(item) > 0 ? (
        <div
          key={index}
          className="lumio-hero__foreground"
          data-hero-foreground={index}
          data-hover-image={item.hoverImage ? 'true' : undefined}
          data-shadow={item.shadow ? 'true' : undefined}
          style={{
            width: `${floatWidthPercent(item)}%`,
            [item.anchorX]: `${floatXPercent(item)}%`,
            [item.anchorY]: `${floatYPercent(item)}%`,
          }}
        >
          <Img
            src={item.image.src}
            srcSet={item.image.srcSet}
            avifSrcSet={item.image.avifSrcSet}
            focalPoint={item.image.focalPoint}
            width={item.image.width}
            height={item.image.height}
            alt={item.image.alt ?? ''}
            aspect="auto"
            sizes={`${Math.max(10, floatWidthPercent(item))}vw`}
            priority
          />
          {item.hoverImage ? (
            <Img
              className="lumio-hero__foreground-hover"
              src={item.hoverImage.src}
              srcSet={item.hoverImage.srcSet}
              avifSrcSet={item.hoverImage.avifSrcSet}
              focalPoint={item.hoverImage.focalPoint}
              width={item.hoverImage.width}
              height={item.hoverImage.height}
              alt=""
              aspect="auto"
              sizes={`${Math.max(10, floatWidthPercent(item))}vw`}
              priority
            />
          ) : null}
        </div>
      ) : null,
    )}
  </>
);

/**
 * The overlay layout is the full-bleed banner every menu page opens with: the
 * photo covers the whole viewport width and the text sits on top of it. The
 * split layouts put the text and the photo side by side; the floating cut-outs
 * are available in every layout.
 */
export const HeroBlock = ({ props, block }: BlockRenderProps<HeroProps>) => {
  if (props.layout === 'overlay') {
    return (
      <div
        className="lumio-hero lumio-hero--overlay"
        data-height={props.heightMode}
        data-align={props.contentAlign}
        data-heading-size={props.headingSize ?? 'md'}
        data-content-width={props.contentWidth ?? 'normal'}
        data-banner-hover={props.hoverImage?.src ? 'true' : undefined}
        style={
          {
            '--hero-zoom': props.backgroundZoom / 100,
            '--hero-x': `${props.backgroundX}%`,
            '--hero-y': `${props.backgroundY}%`,
            '--hero-scrim': props.scrimOpacity / 100,
            '--hero-copy-width': `${props.subheadingWidth}%`,
            '--hero-aspect':
              props.image?.width && props.image?.height
                ? `${props.image.width} / ${props.image.height}`
                : '16 / 9',
          } as CSSProperties
        }
      >
        <Picture
          image={props.image}
          hoverImage={props.hoverImage}
          className="lumio-hero__background"
          sizes={`${Math.max(100, props.backgroundZoom)}vw`}
        />
        <HeroFloats items={props.foregrounds} />
        <HeroContent props={props} block={block} />
      </div>
    );
  }

  return (
    <div
      className={`lumio-hero lumio-hero--${props.layout}`}
      data-banner-hover={props.hoverImage?.src ? 'true' : undefined}
      style={
        {
          '--hero-copy-width': `${props.subheadingWidth}%`,
          '--hero-split-gap': `${props.splitGap}%`,
          '--hero-split-gap-vw': `${props.splitGap}vw`,
        } as CSSProperties
      }
    >
      <HeroContent props={props} block={block} />
      <Picture
        image={props.image}
        hoverImage={props.hoverImage}
        className="lumio-hero__media"
        sizes="(min-width: 960px) 52vw, 100vw"
      />
      <HeroFloats items={props.foregrounds} />
    </div>
  );
};
