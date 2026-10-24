import { Editable } from '../../engine/editable.js';
import { Img } from '../../engine/img.js';
import type { BlockRenderProps } from '../../types.js';
import type { PostsProps } from './schema.js';

export const PostsBlock = ({ props, block }: BlockRenderProps<PostsProps>) => (
  <div className="lumio-posts" data-columns={props.columns}>
    <Editable
      as="h2"
      path="props.heading"
      value={props.heading}
      runs={block.textStyles?.['props.heading']}
      className="lumio-posts__heading"
      label="หัวข้อส่วนบทความ"
    />
    <Editable
      as="p"
      multiline
      path="props.subheading"
      value={props.subheading}
      runs={block.textStyles?.['props.subheading']}
      className="lumio-posts__subheading"
      label="คำอธิบายส่วนบทความ"
    />
    <ul className="lumio-posts__grid">
      {props.items.map((item, index) => (
        <li className="lumio-posts__card" key={index}>
          {props.showImage ? (
            <div className="lumio-posts__media">
              <Img
                src={item.image?.src}
                srcSet={item.image?.srcSet}
                avifSrcSet={item.image?.avifSrcSet}
                focalPoint={item.image?.focalPoint}
                width={item.image?.width}
                height={item.image?.height}
                alt={item.image?.alt || item.title}
                aspect="wide"
              />
            </div>
          ) : null}
          <div className="lumio-posts__body">
            {item.category.length > 0 ? (
              <span className="lumio-posts__category">{item.category}</span>
            ) : null}
            <Editable
              as="h3"
              path={`props.items.${index}.title`}
              value={item.title}
              runs={block.textStyles?.[`props.items.${index}.title`]}
              className="lumio-posts__title"
              label="หัวข้อบทความ"
            />
            {props.showExcerpt ? (
              <Editable
                as="p"
                multiline
                path={`props.items.${index}.excerpt`}
                value={item.excerpt}
                runs={block.textStyles?.[`props.items.${index}.excerpt`]}
                className="lumio-posts__excerpt"
                label="เกริ่นนำบทความ"
              />
            ) : null}
            <div className="lumio-posts__meta">
              {props.showDate && item.date.length > 0 ? <span>{item.date}</span> : null}
              {item.author.length > 0 ? <span>{item.author}</span> : null}
            </div>
            {item.link.length > 0 ? (
              <a className="lumio-posts__link" href={item.link}>
                {item.buttonLabel || 'อ่านต่อ'}
              </a>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  </div>
);
