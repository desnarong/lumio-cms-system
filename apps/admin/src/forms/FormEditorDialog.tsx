import { useState } from 'react';
import {
  createFormInputSchema,
  DEFAULT_FORM_SUCCESS_MESSAGE,
  FORM_FIELD_TYPES,
  type CreateFormInput,
  type Form,
  type FormField,
  type FormFieldType,
} from '@lumio/shared';
import {
  Banner,
  Button,
  Modal,
  Select,
  TextField,
  Textarea,
  translateNow,
  useT,
  type MessageKey,
} from '@lumio/ui';

const TYPE_LABEL_KEYS: Record<FormFieldType, MessageKey> = {
  text: 'forms.typeText',
  email: 'forms.typeEmail',
  tel: 'forms.typeTel',
  textarea: 'forms.typeTextarea',
  select: 'forms.typeSelect',
  checkbox: 'forms.typeCheckbox',
  number: 'forms.typeNumber',
};

let fieldCounter = 0;

const newField = (index: number): FormField => ({
  id: globalThis.crypto?.randomUUID?.() ?? `fld_${++fieldCounter}_${index}`,
  name: `field_${index + 1}`,
  label: translateNow('forms.newField'),
  type: 'text',
  required: false,
  options: [],
});

const fieldFromForm = (field: FormField): FormField => ({ ...field, options: [...field.options] });

const initialInput = (form: Form | null): CreateFormInput =>
  form
    ? {
        name: form.name,
        fields: form.fields.map(fieldFromForm),
        notify: form.notify,
        successMessage: form.successMessage,
      }
    : {
        name: translateNow('forms.defaultName'),
        fields: [
          {
            ...newField(0),
            name: 'name',
            label: translateNow('forms.defaultFieldName'),
            required: true,
          },
          {
            ...newField(1),
            name: 'email',
            label: translateNow('forms.defaultFieldEmail'),
            type: 'email',
            required: true,
          },
          {
            ...newField(2),
            name: 'message',
            label: translateNow('forms.defaultFieldMessage'),
            type: 'textarea',
            required: true,
          },
        ],
        notify: { emails: [] },
        successMessage: DEFAULT_FORM_SUCCESS_MESSAGE,
      };

export interface FormEditorDialogProps {
  form: Form | null;
  saving: boolean;
  onSubmit: (input: CreateFormInput) => void;
  onCancel: () => void;
}

/**
 * Create/edit a contact form: its name, its fields, where new messages are
 * announced, and the thank-you message (docs/design/05-admin-ia.md "ฟอร์ม").
 */
export const FormEditorDialog = ({
  form,
  saving,
  onSubmit,
  onCancel,
}: FormEditorDialogProps) => {
  const t = useT();
  const [input, setInput] = useState<CreateFormInput>(() => initialInput(form));
  const [error, setError] = useState<string | null>(null);

  const typeOptions = FORM_FIELD_TYPES.map((type) => ({
    value: type,
    label: t(TYPE_LABEL_KEYS[type]),
  }));

  const patchField = (index: number, patch: Partial<FormField>): void => {
    setInput((current) => ({
      ...current,
      fields: current.fields.map((field, position) =>
        position === index ? { ...field, ...patch } : field,
      ),
    }));
  };

  const submit = (): void => {
    const parsed = createFormInputSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t('forms.invalid'));
      return;
    }
    setError(null);
    onSubmit(parsed.data);
  };

  return (
    <Modal
      open
      size="lg"
      title={
        form ? t('forms.editTitle', { name: form.name }) : t('forms.createTitle')
      }
      description={t('forms.createBody')}
      onClose={onCancel}
      footer={
        <div className="forms-dialog__actions">
          <Button variant="ghost" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" disabled={saving} onClick={submit}>
            {saving ? t('forms.saving') : t('forms.save')}
          </Button>
        </div>
      }
    >
      {error ? <Banner tone="danger" title={error} /> : null}

      <div className="forms-dialog__body">
        <TextField
          label={t('forms.nameLabel')}
          hint={t('forms.nameHint')}
          value={input.name}
          onChange={(event) => setInput((current) => ({ ...current, name: event.target.value }))}
        />

        <div className="forms-dialog__section">
          <h3 className="forms-dialog__section-title">{t('forms.fieldsTitle')}</h3>
          <ul className="forms-fields">
            {input.fields.map((field, index) => (
              <li className="forms-field" key={field.id}>
                <div className="forms-field__row">
                  <TextField
                    label={t('forms.fieldLabelLabel')}
                    value={field.label}
                    onChange={(event) => patchField(index, { label: event.target.value })}
                  />
                  <TextField
                    label={t('forms.fieldNameLabel')}
                    hint={t('forms.fieldNameHint')}
                    value={field.name}
                    onChange={(event) => patchField(index, { name: event.target.value })}
                  />
                </div>

                <div className="forms-field__row">
                  <Select
                    label={t('forms.fieldTypeLabel')}
                    value={field.type}
                    options={typeOptions}
                    onChange={(event) =>
                      patchField(index, { type: event.target.value as FormFieldType })
                    }
                  />
                  <Select
                    label={t('forms.requiredLabel')}
                    value={field.required ? 'yes' : 'no'}
                    options={[
                      { value: 'no', label: t('forms.optional') },
                      { value: 'yes', label: t('forms.required') },
                    ]}
                    onChange={(event) =>
                      patchField(index, { required: event.target.value === 'yes' })
                    }
                  />
                </div>

                {field.type === 'select' ? (
                  <TextField
                    label={t('forms.optionsLabel')}
                    value={field.options.join(', ')}
                    onChange={(event) =>
                      patchField(index, {
                        options: event.target.value
                          .split(',')
                          .map((option) => option.trim())
                          .filter((option) => option.length > 0),
                      })
                    }
                  />
                ) : null}

                <div className="forms-field__footer">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={input.fields.length <= 1}
                    onClick={() =>
                      setInput((current) => ({
                        ...current,
                        fields: current.fields.filter((_, position) => position !== index),
                      }))
                    }
                  >
                    {t('forms.removeField')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          <Button
            variant="secondary"
            size="sm"
            disabled={input.fields.length >= 20}
            onClick={() =>
              setInput((current) => ({
                ...current,
                fields: [...current.fields, newField(current.fields.length)],
              }))
            }
          >
            {t('forms.addField')}
          </Button>
        </div>

        <div className="forms-dialog__section">
          <h3 className="forms-dialog__section-title">{t('forms.notifyTitle')}</h3>
          <TextField
            label={t('forms.notifyEmails')}
            hint={t('forms.notifyEmailsHint')}
            value={input.notify.emails.join(', ')}
            onChange={(event) =>
              setInput((current) => ({
                ...current,
                notify: {
                  ...current.notify,
                  emails: event.target.value
                    .split(',')
                    .map((email) => email.trim())
                    .filter((email) => email.length > 0),
                },
              }))
            }
          />
          <TextField
            label={t('forms.lineToken')}
            value={input.notify.lineToken ?? ''}
            onChange={(event) =>
              setInput((current) => ({
                ...current,
                notify: {
                  ...current.notify,
                  ...(event.target.value.length > 0 ? { lineToken: event.target.value } : {}),
                },
              }))
            }
          />
        </div>

        <Textarea
          label={t('forms.successMessage')}
          rows={2}
          value={input.successMessage}
          onChange={(event) =>
            setInput((current) => ({ ...current, successMessage: event.target.value }))
          }
        />
      </div>
    </Modal>
  );
};
