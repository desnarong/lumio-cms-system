import { FORM_HONEYPOT_FIELD, type FormField } from '@lumio/shared';
import { Editable } from '../../engine/editable.js';
import type { BlockRenderProps } from '../../types.js';
import type { FormProps } from './schema.js';

const INPUT_TYPES: Partial<Record<FormField['type'], string>> = {
  email: 'email',
  tel: 'tel',
  number: 'number',
  text: 'text',
};

const HelpText = ({ text }: { text: string | undefined }) =>
  text ? <p className="ui-field__hint">{text}</p> : null;

const Field = ({ field, blockId }: { field: FormField; blockId: string }) => {
  const id = `${blockId}-${field.name}`;
  const label = (
    <label className="ui-field__label" htmlFor={id}>
      {field.label}
      {field.required ? (
        <span className="ui-field__required" aria-hidden="true">
          *
        </span>
      ) : null}
    </label>
  );

  if (field.type === 'checkbox') {
    return (
      <div className="lumio-form__field lumio-form__field--check">
        <label className="lumio-form__check" htmlFor={id}>
          <input id={id} type="checkbox" name={field.name} required={field.required} />
          <span>{field.label}</span>
        </label>
        <HelpText text={field.helpText} />
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <div className="lumio-form__field">
        {label}
        <textarea
          id={id}
          name={field.name}
          className="ui-textarea"
          rows={5}
          required={field.required}
          placeholder={field.placeholder ?? undefined}
        />
        <HelpText text={field.helpText} />
      </div>
    );
  }

  if (field.type === 'select') {
    return (
      <div className="lumio-form__field">
        {label}
        <select
          id={id}
          name={field.name}
          className="ui-select"
          required={field.required}
          defaultValue=""
        >
          <option value="">{field.placeholder ?? 'เลือก…'}</option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <HelpText text={field.helpText} />
      </div>
    );
  }

  return (
    <div className="lumio-form__field">
      {label}
      <input
        id={id}
        name={field.name}
        className="ui-input"
        type={INPUT_TYPES[field.type] ?? 'text'}
        required={field.required}
        placeholder={field.placeholder ?? undefined}
      />
      <HelpText text={field.helpText} />
    </div>
  );
};

/**
 * Contact form (docs/design/07-blocks.md 7.1 "ปฏิสัมพันธ์"). It renders a plain
 * HTML form that posts to the renderer, which forwards it to the API - so the
 * public page needs no client JavaScript. The field list comes from the managed
 * form threaded down from the page payload; the editor shows a hint until the
 * user picks one.
 */
export const FormBlock = ({ props, block, forms = [] }: BlockRenderProps<FormProps>) => {
  const form = forms.find((entry) => entry.id === props.formId) ?? null;

  return (
    <div className="lumio-form" data-align={props.align}>
      <Editable
        as="h2"
        path="props.heading"
        value={props.heading}
        className="lumio-form__heading"
        label="หัวข้อฟอร์ม"
      />
      {props.description.length > 0 ? (
        <Editable
          as="p"
          multiline
          path="props.description"
          value={props.description}
          className="lumio-form__description"
          label="คำอธิบายฟอร์ม"
        />
      ) : null}

      {!form ? (
        <p className="lumio-form__note" role="note">
          ยังไม่ได้เลือกแบบฟอร์มสำหรับส่วนนี้ เลือกได้จากแผงด้านขวา
        </p>
      ) : (
        <form
          className="lumio-form__form"
          method="post"
          action={`/forms/${form.id}`}
          data-form-id={form.id}
        >
          <div className="lumio-form__honeypot" aria-hidden="true">
            <label htmlFor={`${block.id}-hp`}>ห้ามกรอกช่องนี้</label>
            <input id={`${block.id}-hp`} type="text" name={FORM_HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" />
          </div>

          {form.fields.map((field) => (
            <Field key={field.id} field={field} blockId={block.id} />
          ))}

          <button type="submit" className="ui-button ui-button--primary ui-button--md lumio-form__submit">
            <Editable path="props.submitLabel" value={props.submitLabel} label="ข้อความบนปุ่ม" />
          </button>
        </form>
      )}

      {/*
        The renderer redirects back with `#sent-<id>` (or `#error-<id>`) after a
        submission. Both notes are hidden until CSS `:target` matches, so the page
        stays static and needs no JavaScript.
      */}
      {form ? (
        <>
          <p className="lumio-form__sent" id={`sent-${form.id}`} role="status">
            {form.successMessage}
          </p>
          <p className="lumio-form__sent lumio-form__sent--error" id={`error-${form.id}`} role="alert">
            ส่งข้อความไม่สำเร็จ กรุณาลองอีกครั้ง
          </p>
        </>
      ) : null}
    </div>
  );
};
