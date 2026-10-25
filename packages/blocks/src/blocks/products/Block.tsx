import { Editable } from '../../engine/editable.js';
import { Img } from '../../engine/img.js';
import type { BlockRenderProps, ShopProductCard } from '../../types.js';
import type { ProductCard, ProductsProps } from './schema.js';
import { shopProductsFor } from './shop.js';

const formatPrice = (value: number, currency: string): string =>
  `${currency}${value.toLocaleString('th-TH', {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;

interface PriceValue {
  price: number;
  compareAtPrice?: number | null;
  currency: string;
  soldOut: boolean;
}

const Price = ({ item }: { item: PriceValue }) => {
  if (item.soldOut) {
    return <span className="lumio-products__soldout">สินค้าหมด</span>;
  }
  if (item.price <= 0) {
    return <span className="lumio-products__price">สอบถามราคา</span>;
  }
  const compareAt =
    typeof item.compareAtPrice === 'number' && item.compareAtPrice > item.price
      ? item.compareAtPrice
      : null;
  return (
    <span className="lumio-products__price">
      {formatPrice(item.price, item.currency)}
      {compareAt !== null ? (
        <s className="lumio-products__compare">{formatPrice(compareAt, item.currency)}</s>
      ) : null}
    </span>
  );
};

const LiveCard = ({ item }: { item: ShopProductCard }) => (
  <li className="lumio-products__card" data-sold-out={item.soldOut ? 'true' : undefined}>
    <div className="lumio-products__media">
      <Img src={item.image ?? undefined} alt={item.name} aspect="square" />
    </div>
    <div className="lumio-products__body">
      <h3 className="lumio-products__name">{item.name}</h3>
      {item.description.length > 0 ? (
        <p className="lumio-products__description">{item.description}</p>
      ) : null}
      <Price item={item} />
      <a
        className="ui-button ui-button--primary ui-button--md lumio-products__button"
        href={item.link}
      >
        ดูสินค้า
      </a>
    </div>
  </li>
);

interface ManualCardProps {
  item: ProductCard;
  index: number;
  block: BlockRenderProps<ProductsProps>['block'];
  showDescription: boolean;
  showPrice: boolean;
}

const ManualCard = ({ item, index, block, showDescription, showPrice }: ManualCardProps) => (
  <li className="lumio-products__card" data-sold-out={item.soldOut ? 'true' : undefined}>
    <div className="lumio-products__media">
      <Img
        src={item.image?.src}
        srcSet={item.image?.srcSet}
        avifSrcSet={item.image?.avifSrcSet}
        focalPoint={item.image?.focalPoint}
        width={item.image?.width}
        height={item.image?.height}
        alt={item.image?.alt || item.name}
        aspect="square"
      />
      {item.badge.length > 0 ? <span className="lumio-products__badge">{item.badge}</span> : null}
    </div>
    <div className="lumio-products__body">
      <Editable
        as="h3"
        path={`props.items.${index}.name`}
        value={item.name}
        runs={block.textStyles?.[`props.items.${index}.name`]}
        layout={block.textLayouts?.[`props.items.${index}.name`]}
        className="lumio-products__name"
        label="ชื่อสินค้า"
      />
      {showDescription ? (
        <Editable
          as="p"
          multiline
          path={`props.items.${index}.description`}
          value={item.description}
          runs={block.textStyles?.[`props.items.${index}.description`]}
          layout={block.textLayouts?.[`props.items.${index}.description`]}
          className="lumio-products__description"
          label="คำอธิบายสินค้า"
        />
      ) : null}
      {showPrice ? <Price item={item} /> : null}
      {item.link.length > 0 ? (
        <a
          className="ui-button ui-button--primary ui-button--md lumio-products__button"
          href={item.link}
        >
          {item.buttonLabel || 'ดูสินค้า'}
        </a>
      ) : null}
    </div>
  </li>
);

export const ProductsBlock = ({ props, block, shopProducts }: BlockRenderProps<ProductsProps>) => {
  const live = props.source === 'shop';
  const cards =
    live && shopProducts !== undefined
      ? shopProductsFor(
          { category: props.sourceCategory, limit: props.sourceLimit },
          shopProducts,
        )
      : null;

  return (
    <div
      className="lumio-products"
      data-columns={props.columns}
      data-card-style={props.cardStyle}
      data-source={props.source}
    >
      <Editable
        as="h2"
        path="props.heading"
        value={props.heading}
        runs={block.textStyles?.['props.heading']}
        layout={block.textLayouts?.['props.heading']}
        className="lumio-products__heading"
        label="หัวข้อส่วนสินค้า"
      />
      <Editable
        as="p"
        multiline
        path="props.subheading"
        value={props.subheading}
        runs={block.textStyles?.['props.subheading']}
        layout={block.textLayouts?.['props.subheading']}
        className="lumio-products__subheading"
        label="คำอธิบายส่วนสินค้า"
      />
      {cards !== null ? (
        cards.length === 0 ? (
          <p className="lumio-products__empty" role="note">
            ยังไม่มีสินค้าที่เผยแพร่ในร้าน
          </p>
        ) : (
          <ul className="lumio-products__grid">
            {cards.map((item) => (
              <LiveCard key={item.id} item={item} />
            ))}
          </ul>
        )
      ) : (
        <ul className="lumio-products__grid">
          {props.items.map((item, index) => (
            <ManualCard
              key={index}
              item={item}
              index={index}
              block={block}
              showDescription={props.showDescription}
              showPrice={props.showPrice}
            />
          ))}
        </ul>
      )}
    </div>
  );
};
