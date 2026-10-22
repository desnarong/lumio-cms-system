import { Editable } from '../../engine/editable.js';
import { Img } from '../../engine/img.js';
import type { BlockRenderProps } from '../../types.js';
import type { HeroProps } from './schema.js';

export const HeroBlock = ({ props }: BlockRenderProps<HeroProps>) => (
  <div className={`lumio-hero lumio-hero--${props.layout}`}>
    <div className="lumio-hero__content">
      <Editable
        as="h1"
        path="props.heading"
        value={props.heading}
        className="lumio-hero__heading"
        label="หัวข้อหลัก"
      />
      <Editable
        as="p"
        multiline
        path="props.subheading"
        value={props.subheading}
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
                label="ข้อความปุ่ม"
              />
            </a>
          ))}
        </div>
      ) : null}
    </div>

    <div className="lumio-hero__media">
      <Img
        src={props.image?.src}
        srcSet={props.image?.srcSet}
        avifSrcSet={props.image?.avifSrcSet}
        focalPoint={props.image?.focalPoint}
        width={props.image?.width}
        height={props.image?.height}
        alt={props.image?.alt ?? ''}
        aspect="wide"
        priority
      />
    </div>
  </div>
);
