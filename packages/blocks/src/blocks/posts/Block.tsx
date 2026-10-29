import { Editable } from '../../engine/editable.js';
import { Img } from '../../engine/img.js';
import type { BlockRenderProps, LatestPostCard } from '../../types.js';
import type { PostsProps } from './schema.js';

/** One card fed by the blog itself, so deleted posts can never linger here. */
const LiveCard = ({
  item,
  showImage,
  showExcerpt,
  showDate,
}: {
  item: LatestPostCard;
  showImage: boolean;
  showExcerpt: boolean;
  showDate: boolean;
}) => (
  <li className="lumio-posts__card">
    {showImage ? (
      <div className="lumio-posts__media">
        <Img src={item.image ?? undefined} alt={item.title} aspect="wide" />
      </div>
    ) : null}
    <div className="lumio-posts__body">
      <h3 className="lumio-posts__title">{item.title}</h3>
      {showExcerpt && item.excerpt.length > 0 ? (
        <p className="lumio-posts__excerpt">{item.excerpt}</p>
      ) : null}
      {showDate && item.date.length > 0 ? (
        <div className="lumio-posts__meta">
          <span>{item.date}</span>
        </div>
      ) : null}
      <a className="lumio-posts__link" href={item.link}>
        อ่านต่อ
      </a>
    </div>
  </li>
);

export const PostsBlock = ({ props, block, latestPosts }: BlockRenderProps<PostsProps>) => {
  const live = props.source === 'latest' && latestPosts !== undefined;
  const liveCards = live ? latestPosts.slice(0, props.sourceLimit) : null;

  return (
    <div className="lumio-posts" data-columns={props.columns}>
      <Editable
        as="h2"
        path="props.heading"
        value={props.heading}
        runs={block.textStyles?.['props.heading']}
        layout={block.textLayouts?.['props.heading']}
        className="lumio-posts__heading"
        label="หัวข้อส่วนบทความ"
      />
      <Editable
        as="p"
        multiline
        path="props.subheading"
        value={props.subheading}
        runs={block.textStyles?.['props.subheading']}
        layout={block.textLayouts?.['props.subheading']}
        className="lumio-posts__subheading"
        label="คำอธิบายส่วนบทความ"
      />
      {liveCards !== null ? (
        liveCards.length === 0 ? (
          <p className="lumio-posts__empty" role="note">
            ยังไม่มีบทความที่เผยแพร่
          </p>
        ) : (
          <ul className="lumio-posts__grid">
            {liveCards.map((item) => (
              <LiveCard
                key={item.id}
                item={item}
                showImage={props.showImage}
                showExcerpt={props.showExcerpt}
                showDate={props.showDate}
              />
            ))}
          </ul>
        )
      ) : (
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
                  layout={block.textLayouts?.[`props.items.${index}.title`]}
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
                    layout={block.textLayouts?.[`props.items.${index}.excerpt`]}
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
      )}
    </div>
  );
};
