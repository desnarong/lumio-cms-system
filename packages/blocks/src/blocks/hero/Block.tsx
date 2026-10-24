import type { CSSProperties } from 'react';
import type { BlockNode } from '@lumio/shared';
import { Editable } from '../../engine/editable.js';
import { Img } from '../../engine/img.js';
import type { BlockRenderProps } from '../../types.js';
import type { HeroProps } from './schema.js';

const HeroContent = ({ props, block }: { props: HeroProps; block: BlockNode }) => (
  <div className="lumio-hero__content">
    <Editable
      as="h1"
      path="props.heading"
      value={props.heading}
      runs={block.textStyles?.['props.heading']}
      className="lumio-hero__heading"
      label="หัวข้อหลัก"
    />
    <Editable
      as="p"
      multiline
      path="props.subheading"
      value={props.subheading}
      runs={block.textStyles?.['props.subheading']}
      className="lumio-hero__subheading"
      label="คำอธิบายใต้หัวข้อ"
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
  className: string;
}

const Picture = ({ image, className }: PictureProps) => (
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
      priority
    />
  </div>
);

/**
 * The overlay layout is the full-bleed banner every menu page opens with: the
 * photo covers the whole viewport width and the text sits on top of it. A second
 * picture (the product cut-out) floats above both, at a pixel offset the editor
 * controls.
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
        style={
          {
            '--hero-zoom': props.backgroundZoom / 100,
            '--hero-x': `${props.backgroundX}%`,
            '--hero-y': `${props.backgroundY}%`,
            '--hero-scrim': props.scrimOpacity / 100,
            '--hero-aspect':
              props.image?.width && props.image?.height
                ? `${props.image.width} / ${props.image.height}`
                : '16 / 9',
          } as CSSProperties
        }
      >
        <Picture image={props.image} className="lumio-hero__background" />
        {props.foregrounds.map((item, index) =>
          item.image && item.width > 0 ? (
            <div
              key={index}
              className="lumio-hero__foreground"
              data-hero-foreground={index}
              data-hover-image={item.hoverImage ? 'true' : undefined}
              data-shadow={item.shadow ? 'true' : undefined}
              style={{
                width: `${item.width}px`,
                [item.anchorX]: `${item.x}px`,
                [item.anchorY]: `${item.y}px`,
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
                  priority
                />
              ) : null}
            </div>
          ) : null,
        )}
        <HeroContent props={props} block={block} />
      </div>
    );
  }

  return (
    <div className={`lumio-hero lumio-hero--${props.layout}`}>
      <HeroContent props={props} block={block} />
      <Picture image={props.image} className="lumio-hero__media" />
    </div>
  );
};
