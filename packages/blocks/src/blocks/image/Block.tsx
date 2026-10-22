import { Editable } from '../../engine/editable.js';
import { Img } from '../../engine/img.js';
import type { BlockRenderProps } from '../../types.js';
import type { ImageProps } from './schema.js';

export const ImageBlock = ({ props }: BlockRenderProps<ImageProps>) => (
  <figure
    className={`lumio-image lumio-image--${props.align}${
      props.rounded ? ' lumio-image--rounded' : ''
    }`}
  >
    <Img
      src={props.image?.src}
      srcSet={props.image?.srcSet}
      avifSrcSet={props.image?.avifSrcSet}
      focalPoint={props.image?.focalPoint}
      width={props.image?.width}
      height={props.image?.height}
      alt={props.image?.alt ?? ''}
      aspect={props.aspect}
    />
    <Editable
      as="figcaption"
      path="props.caption"
      value={props.caption}
      className="lumio-image__caption"
      label="คำบรรยายภาพ"
      placeholder="คำบรรยายภาพ (ไม่บังคับ)"
    />
  </figure>
);
