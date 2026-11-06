import { useEffect, useState } from 'react';
import {
  PROMOTION_KINDS,
  promotionDay,
  type Promotion,
  type PromotionInput,
  type PromotionKind,
} from '@lumio/shared';
import {
  Button,
  EmptyState,
  ImagePicker,
  Modal,
  PageHeader,
  Select,
  Skeleton,
  Switch,
  TextField,
  Textarea,
  useT,
  useToast,
  type MessageKey,
} from '@lumio/ui';
import type { MediaPickerApi } from '@lumio/blocks';
import type { CommerceApi } from './api.js';
import { ApiError } from '../api-error.js';

const KIND_LABELS: Record<PromotionKind, MessageKey> = {
  bundle: 'promo.kind.bundle',
  discount: 'promo.kind.discount',
  shipping: 'promo.kind.shipping',
  gift: 'promo.kind.gift',
  install: 'promo.kind.install',
  other: 'promo.kind.other',
};

interface Draft {
  title: string;
  description: string;
  kind: PromotionKind;
  badge: string;
  imageUrl: string;
  imageAlt: string;
  buyQty: string;
  getQty: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
  sort: string;
}

const emptyDraft = (kind: PromotionKind = 'bundle'): Draft => ({
  title: '',
  description: '',
  kind,
  badge: '',
  imageUrl: '',
  imageAlt: '',
  buyQty: '',
  getQty: '',
  startsAt: '',
  endsAt: '',
  active: true,
  sort: '0',
});

/** `2026-10-28T04:00:00.000Z` → `2026-10-28`, what a date input wants. */
const dateValue = (iso: string | null): string => (iso ? iso.slice(0, 10) : '');

const draftFrom = (promotion: Promotion): Draft => ({
  title: promotion.title,
  description: promotion.description,
  kind: promotion.kind,
  badge: promotion.badge,
  imageUrl: promotion.imageUrl ?? '',
  imageAlt: promotion.imageAlt,
  buyQty: promotion.buyQty === null ? '' : String(promotion.buyQty),
  getQty: promotion.getQty === null ? '' : String(promotion.getQty),
  startsAt: dateValue(promotion.startsAt),
  endsAt: dateValue(promotion.endsAt),
  active: promotion.active,
  sort: String(promotion.sort),
});

/** A date input means the whole day, so an end date is kept until midnight. */
const toIso = (value: string, endOfDay = false): string | null => {
  if (value.trim().length === 0) return null;
  const date = new Date(`${value.trim()}T${endOfDay ? '23:59:59' : '00:00:00'}`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const inputFrom = (draft: Draft): PromotionInput => ({
  title: draft.title.trim(),
  description: draft.description.trim(),
  kind: draft.kind,
  badge: draft.badge.trim(),
  imageUrl: draft.imageUrl.trim().length > 0 ? draft.imageUrl.trim() : null,
  imageAlt: draft.imageAlt.trim(),
  buyQty: draft.kind === 'bundle' && draft.buyQty ? Number(draft.buyQty) : null,
  getQty: draft.kind === 'bundle' && draft.getQty ? Number(draft.getQty) : null,
  startsAt: toIso(draft.startsAt),
  endsAt: toIso(draft.endsAt, true),
  active: draft.active,
  sort: Number(draft.sort) || 0,
});

interface PromotionsTabProps {
  api: CommerceApi;
  canManage: boolean;
  /** Opens the media library; `null` leaves the image button disabled. */
  mediaPicker?: MediaPickerApi | null;
}

/**
 * Offer campaigns such as "ซื้อ 10 แถม 1". A page that shows the live promotion
 * list picks these up on its own, so an expired offer disappears without an edit.
 */
export const PromotionsTab = ({ api, canManage, mediaPicker = null }: PromotionsTabProps) => {
  const t = useT();
  const toast = useToast();
  const [items, setItems] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Promotion | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      setItems(await api.listPromotions());
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : t('common.genericError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [api]);

  const openNew = (): void => {
    setDraft(emptyDraft());
    setFormError(null);
    setEditing('new');
  };

  const openEdit = (promotion: Promotion): void => {
    setDraft(draftFrom(promotion));
    setFormError(null);
    setEditing(promotion);
  };

  const save = async (): Promise<void> => {
    const input = inputFrom(draft);
    if (input.title.length === 0) {
      setFormError(t('promo.titleRequired'));
      return;
    }
    if (input.kind === 'bundle' && (!input.buyQty || !input.getQty)) {
      setFormError(t('promo.bundleRequired'));
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editing === 'new') {
        const created = await api.createPromotion(input);
        setItems((current) => [...current, created]);
      } else if (editing) {
        const updated = await api.updatePromotion(editing.id, input);
        setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      }
      setEditing(null);
      toast.push({ tone: 'success', title: t('promo.saved') });
    } catch (saveError) {
      setFormError(saveError instanceof ApiError ? saveError.message : t('common.genericError'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (promotion: Promotion): Promise<void> => {
    const previous = items;
    setItems((current) => current.filter((item) => item.id !== promotion.id));
    try {
      await api.removePromotion(promotion.id);
      toast.push({
        tone: 'success',
        title: t('promo.deleted'),
        undo: {
          label: t('common.undo'),
          onClick: () => {
            void (async () => {
              try {
                // The API kept the row, so undo brings back the same id.
                const restored = await api.restorePromotion(promotion.id);
                setItems((current) => [...current, restored]);
              } catch {
                setItems(previous);
              }
            })();
          },
        },
      });
    } catch (removeError) {
      setItems(previous);
      toast.push({
        tone: 'danger',
        title: removeError instanceof ApiError ? removeError.message : t('common.genericError'),
      });
    }
  };

  return (
    <div className="commerce-tab">
      <PageHeader
        title={t('commerce.promotions')}
        description={t('promo.description')}
        actions={
          canManage ? (
            <Button variant="primary" onClick={openNew}>
              {t('promo.add')}
            </Button>
          ) : null
        }
      />

      {loading ? (
        <div className="promotions-grid" aria-busy="true">
          <Skeleton shape="block" height={150} />
          <Skeleton shape="block" height={150} />
          <Skeleton shape="block" height={150} />
        </div>
      ) : error ? (
        <EmptyState
          tone="error"
          title={t('promo.loadError')}
          description={error}
          action={
            <Button variant="secondary" onClick={() => void load()}>
              {t('common.retry')}
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState
          title={t('promo.empty')}
          description={t('promo.emptyHint')}
          {...(canManage ? { action: <Button onClick={openNew}>{t('promo.add')}</Button> } : {})}
        />
      ) : (
        <ul className="promotions-grid">
          {items.map((promotion) => (
            <li className="promotion-card" key={promotion.id}>
              {promotion.imageUrl ? (
                <img
                  className="promotion-card__image"
                  src={promotion.imageUrl}
                  alt={promotion.imageAlt || promotion.title}
                  loading="lazy"
                />
              ) : null}
              <div className="promotion-card__head">
                <span className="promotion-card__kind">{t(KIND_LABELS[promotion.kind])}</span>
                <span className={promotion.active ? 'chip chip--success' : 'chip'}>
                  {promotion.active ? t('promo.active') : t('promo.inactive')}
                </span>
              </div>
              <h3 className="promotion-card__title">{promotion.title}</h3>
              {promotion.description ? (
                <p className="promotion-card__description">{promotion.description}</p>
              ) : null}
              <p className="promotion-card__meta">
                {promotion.kind === 'bundle' && promotion.buyQty && promotion.getQty
                  ? t('promo.buyGet', { buy: promotion.buyQty, get: promotion.getQty })
                  : null}
                {promotion.startsAt || promotion.endsAt ? (
                  <span>
                    {promotion.startsAt
                      ? t('promo.starts', { date: promotionDay(promotion.startsAt) })
                      : null}
                    {promotion.startsAt && promotion.endsAt ? ' · ' : null}
                    {promotion.endsAt
                      ? t('promo.ends', { date: promotionDay(promotion.endsAt) })
                      : null}
                  </span>
                ) : (
                  <span>{t('promo.noExpiry')}</span>
                )}
              </p>
              {canManage ? (
                <div className="promotion-card__actions">
                  <Button size="sm" variant="secondary" onClick={() => openEdit(promotion)}>
                    {t('promo.editAction')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void remove(promotion)}>
                    {t('common.delete')}
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={editing !== null}
        title={editing === 'new' ? t('promo.add') : t('promo.edit')}
        description={t('promo.formHint')}
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" onClick={() => void save()} disabled={saving}>
              {saving ? t('common.loading') : t('common.save')}
            </Button>
          </>
        }
      >
        <div className="promotion-form">
          <TextField
            label={t('promo.name')}
            value={draft.title}
            autoFocus
            placeholder={t('promo.namePlaceholder')}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          />
          <Select
            label={t('promo.kind')}
            value={draft.kind}
            options={PROMOTION_KINDS.map((kind) => ({ value: kind, label: t(KIND_LABELS[kind]) }))}
            onChange={(event) => setDraft({ ...draft, kind: event.target.value as PromotionKind })}
          />
          {draft.kind === 'bundle' ? (
            <div className="promotion-form__row">
              <TextField
                label={t('promo.buyQty')}
                type="number"
                min={2}
                value={draft.buyQty}
                onChange={(event) => setDraft({ ...draft, buyQty: event.target.value })}
              />
              <TextField
                label={t('promo.getQty')}
                type="number"
                min={1}
                value={draft.getQty}
                onChange={(event) => setDraft({ ...draft, getQty: event.target.value })}
              />
            </div>
          ) : null}
          <ImagePicker
            label={t('promo.image')}
            hint={t('promo.imageHint')}
            value={draft.imageUrl || null}
            alt={draft.imageAlt || draft.title}
            aspect="wide"
            disabled={!mediaPicker}
            pickLabel={t('promo.pickImage')}
            onPick={() => {
              void mediaPicker
                ?.pick({ aspect: 'wide' })
                .then((picked) => {
                  if (picked) setDraft({ ...draft, imageUrl: picked.url });
                })
                .catch((caught: unknown) => {
                  setFormError(
                    caught instanceof ApiError ? caught.message : t('common.genericError'),
                  );
                });
            }}
            onChange={(url) => setDraft({ ...draft, imageUrl: url ?? '' })}
          />
          {draft.imageUrl ? (
            <TextField
              label={t('promo.imageAlt')}
              hint={t('promo.imageAltHint')}
              value={draft.imageAlt}
              placeholder={t('promo.imageAltPlaceholder')}
              onChange={(event) => setDraft({ ...draft, imageAlt: event.target.value })}
            />
          ) : null}
          <Textarea
            label={t('promo.details')}
            rows={2}
            value={draft.description}
            onChange={(event) => setDraft({ ...draft, description: event.target.value })}
          />
          <div className="promotion-form__row">
            <TextField
              label={t('promo.startDate')}
              type="date"
              value={draft.startsAt}
              onChange={(event) => setDraft({ ...draft, startsAt: event.target.value })}
            />
            <TextField
              label={t('promo.endDate')}
              type="date"
              value={draft.endsAt}
              onChange={(event) => setDraft({ ...draft, endsAt: event.target.value })}
            />
          </div>
          <Switch
            label={t('promo.enable')}
            checked={draft.active}
            onChange={(checked) => setDraft({ ...draft, active: checked })}
          />
          {formError ? (
            <p className="promotion-form__error" role="alert">
              {formError}
            </p>
          ) : null}
        </div>
      </Modal>
    </div>
  );
};
