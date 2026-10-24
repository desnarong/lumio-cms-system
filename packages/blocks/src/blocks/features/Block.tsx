import type { CSSProperties } from 'react';
import { Icon } from '@lumio/ui/icon';
import { Editable } from '../../engine/editable.js';
import { Img } from '../../engine/img.js';
import type { BlockRenderProps } from '../../types.js';
import type { FeatureItem, FeaturesProps } from './schema.js';

const iconStyle = (item: FeatureItem): CSSProperties =>
  ({ '--feature-icon-size': `${item.iconSize ?? 48}px` }) as CSSProperties;

const cardFocalPoint = (item: FeatureItem) => {
  if (item.mediaPosition === 'top') return { x: 0.5, y: 0 };
  if (item.mediaPosition === 'bottom') return { x: 0.5, y: 1 };
  return item.image?.focalPoint;
};

const FeatureIcon = ({ item }: { item: FeatureItem }) => {
  if (item.showIcon === false) return null;
  if (item.iconImage) {
    return (
      <span
        className="lumio-features__icon lumio-features__icon--image"
        style={iconStyle(item)}
      >
        <Img
          src={item.iconImage.src}
          srcSet={item.iconImage.srcSet}
          avifSrcSet={item.iconImage.avifSrcSet}
          focalPoint={item.iconImage.focalPoint}
          width={item.iconImage.width}
          height={item.iconImage.height}
          alt={item.iconImage.alt ?? ''}
          aspect="square"
        />
      </span>
    );
  }
  if (item.iconName) {
    return (
      <span className="lumio-features__icon lumio-features__icon--line" style={iconStyle(item)}>
        <Icon name={item.iconName} size={Math.round((item.iconSize ?? 48) / 2)} />
      </span>
    );
  }
  if (item.icon.length > 0) {
    return (
      <span
        className="lumio-features__icon lumio-features__icon--emoji"
        style={iconStyle(item)}
        aria-hidden="true"
      >
        {item.icon}
      </span>
    );
  }
  return null;
};

export const FeaturesBlock = ({ props, block }: BlockRenderProps<FeaturesProps>) => {
  const backgroundMode =
    props.textBackground === true
      ? 'panel'
      : props.textBackground === false || props.textBackground === undefined
        ? 'none'
        : props.textBackground;

  return (
  <div
    className="lumio-features"
    data-subheading-width={props.subheadingWidth ?? 'normal'}
    data-card-style={props.cardStyle ?? 'card'}
    data-card-gap={props.cardGap ?? 'lg'}
    data-content-align={props.contentAlign ?? 'left'}
    data-text-overlay={props.textOverlay ? 'true' : 'false'}
    data-full-width={props.fullWidth ? 'true' : 'false'}
    data-text-background={backgroundMode !== 'none' ? 'true' : 'false'}
    data-text-background-mode={backgroundMode}
    data-text-flush-bottom={props.textFlushBottom ? 'true' : 'false'}
    data-button-visibility={props.buttonVisibility ?? 'always'}
    style={
      {
        '--feature-card-height': props.cardHeight ? `${props.cardHeight}px` : undefined,
      } as CSSProperties
    }
  >
    <Editable
      as="h2"
      path="props.heading"
      value={props.heading}
      runs={block.textStyles?.['props.heading']}
      className="lumio-features__heading"
      label="หัวข้อส่วน"
    />
    <Editable
      as="p"
      multiline
      path="props.subheading"
      value={props.subheading}
      runs={block.textStyles?.['props.subheading']}
      className="lumio-features__subheading"
      label="คำอธิบายส่วน"
    />
    <ul className="lumio-features__grid" data-columns={props.columns}>
      {props.items.map((item, index) => (
        <li className="lumio-features__item" key={index}>
          {item.image ? (
            <div className="lumio-features__media" data-fit={item.mediaFit ?? 'cover'}>
              <Img
                className="lumio-features__image lumio-features__image--base"
                src={item.image.src}
                srcSet={item.image.srcSet}
                avifSrcSet={item.image.avifSrcSet}
                focalPoint={cardFocalPoint(item)}
                width={item.image.width}
                height={item.image.height}
                alt={item.image.alt ?? ''}
                aspect={item.mediaAspect ?? 'wide'}
              />
              {item.hoverImage ? (
                <Img
                  className="lumio-features__image lumio-features__image--hover"
                  src={item.hoverImage.src}
                  srcSet={item.hoverImage.srcSet}
                  avifSrcSet={item.hoverImage.avifSrcSet}
                  focalPoint={item.hoverImage.focalPoint}
                  width={item.hoverImage.width}
                  height={item.hoverImage.height}
                  alt=""
                  aspect={item.mediaAspect ?? 'wide'}
                />
              ) : null}
            </div>
          ) : null}
          <div className="lumio-features__body">
            <FeatureIcon item={item} />
            <Editable
              as="h3"
              path={`props.items.${index}.title`}
              value={item.title}
              runs={block.textStyles?.[`props.items.${index}.title`]}
              className="lumio-features__title"
              label="ชื่อจุดเด่น"
            />
            <Editable
              as="p"
              multiline
              path={`props.items.${index}.description`}
              value={item.description}
              runs={block.textStyles?.[`props.items.${index}.description`]}
              className="lumio-features__text"
              label="คำอธิบายจุดเด่น"
            />
            {item.link.length > 0 && item.buttonLabel.length > 0 ? (
              <a
                className="ui-button ui-button--secondary ui-button--md lumio-features__button"
                href={item.link}
              >
                {item.buttonLabel}
              </a>
            ) : null}
          </div>
          {item.link.length > 0 && item.buttonLabel.length === 0 ? (
            <a className="lumio-features__overlay" href={item.link} aria-label={item.title} />
          ) : null}
        </li>
      ))}
    </ul>
  </div>
  );
};
