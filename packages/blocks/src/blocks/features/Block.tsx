import { Editable } from '../../engine/editable.js';
import type { BlockRenderProps } from '../../types.js';
import type { FeaturesProps } from './schema.js';

export const FeaturesBlock = ({ props }: BlockRenderProps<FeaturesProps>) => (
  <div className="lumio-features">
    <Editable
      as="h2"
      path="props.heading"
      value={props.heading}
      className="lumio-features__heading"
      label="หัวข้อส่วน"
    />
    <Editable
      as="p"
      multiline
      path="props.subheading"
      value={props.subheading}
      className="lumio-features__subheading"
      label="คำอธิบายส่วน"
    />
    <ul className="lumio-features__grid" data-columns={props.columns}>
      {props.items.map((item, index) => (
        <li className="lumio-features__item" key={index}>
          {item.icon.length > 0 ? (
            <span className="lumio-features__icon" aria-hidden="true">
              {item.icon}
            </span>
          ) : null}
          <Editable
            as="h3"
            path={`props.items.${index}.title`}
            value={item.title}
            className="lumio-features__title"
            label="ชื่อจุดเด่น"
          />
          <Editable
            as="p"
            multiline
            path={`props.items.${index}.description`}
            value={item.description}
            className="lumio-features__text"
            label="คำอธิบายจุดเด่น"
          />
        </li>
      ))}
    </ul>
  </div>
);
