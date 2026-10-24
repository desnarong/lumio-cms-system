import { useEffect, useMemo, useState } from 'react';
import {
  canRefundOrder,
  formatBaht,
  ORDER_WEBHOOK_EVENTS,
  parseBaht,
  slugify,
  type BankConnection,
  type CommerceSettings,
  type ConnectStatus,
  type OrderDetail,
  type OrderSummary,
  type OrderStatus,
  type OrderWebhookEvent,
  type OrderWebhookView,
  type ProductOption,
  type ProductStatus,
  type ProductSummary,
  type ProductVariantInput,
  type ReviewSlipInput,
} from '@lumio/shared';
import {
  Icon,
  Banner,
  Button,
  Card,
  EmptyState,
  Modal,
  Select,
  Skeleton,
  translateNow,
  Switch,
  TextField,
  Textarea,
  useT,
  useToast,
  type MessageKey,
} from '@lumio/ui';
import { ApiError } from '../api-error.js';
import type { MediaApi } from '../media/api.js';
import type { CommerceApi } from './api.js';
import type { CommerceTab } from '../route.js';
import {
  combinationKey,
  combinationLabel,
  formatOptionsText,
  optionCombinations,
  parseOptionsText,
} from './product-variants.js';

const STATUS_KEYS: Record<ProductStatus, MessageKey> = {
  draft: 'commerce.statusDraft',
  active: 'commerce.statusActive',
  archived: 'commerce.statusArchived',
};

const ORDER_STATUS_KEYS: Record<OrderStatus, MessageKey> = {
  pending: 'commerce.orderPending',
  paid: 'commerce.orderPaid',
  shipped: 'commerce.orderShipped',
  completed: 'commerce.orderCompleted',
  cancelled: 'commerce.orderCancelled',
  refunded: 'commerce.orderRefunded',
};

const messageOf = (error: unknown): string => (error instanceof ApiError ? error.message : '');

const formatDate = (iso: string): string => {
  const [date] = iso.split('T');
  const [year, month, day] = (date ?? '').split('-');
  return year && month && day ? `${day}/${month}/${year}` : '';
};

/* ---------------------------------------------------------------- products */

interface VariantDraft {
  key: string;
  id?: string;
  values: Record<string, string>;
  price: string;
  compareAtPrice: string;
  stock: string;
  sku: string;
}

interface ProductDraft {
  title: string;
  slug: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  weightGrams: string;
  optionsText: string;
  variants: VariantDraft[];
  category: string;
  description: string;
  status: ProductStatus;
  mediaId: string;
}

const emptyDraft = (): ProductDraft => ({
  title: '',
  slug: '',
  price: '',
  compareAtPrice: '',
  stock: '',
  weightGrams: '0',
  optionsText: '',
  variants: [],
  category: '',
  description: '',
  status: 'draft',
  mediaId: '',
});

const variantDraftsFor = (
  options: readonly ProductOption[],
  product?: ProductSummary,
): VariantDraft[] =>
  optionCombinations(options).map((values) => {
    const key = combinationKey(values);
    const existing = product?.variants.find((variant) => variant.signature === key);
    return {
      key,
      values,
      ...(existing ? { id: existing.id } : {}),
      price:
        existing?.price === null || existing?.price === undefined ? '' : formatBaht(existing.price),
      compareAtPrice:
        existing?.compareAtPrice === null || existing?.compareAtPrice === undefined
          ? ''
          : formatBaht(existing.compareAtPrice),
      stock:
        existing?.stock === null || existing?.stock === undefined ? '' : String(existing.stock),
      sku: existing?.sku ?? '',
    };
  });

const syncVariantDrafts = (
  options: readonly ProductOption[],
  current: readonly VariantDraft[],
): VariantDraft[] =>
  optionCombinations(options).map((values) => {
    const key = combinationKey(values);
    const previous = current.find((variant) => variant.key === key);
    return (
      previous ?? {
        key,
        values,
        price: '',
        compareAtPrice: '',
        stock: '',
        sku: '',
      }
    );
  });

const draftFor = (product: ProductSummary): ProductDraft => ({
  title: product.title,
  slug: product.slug,
  price: formatBaht(product.price),
  compareAtPrice: product.compareAtPrice === null ? '' : formatBaht(product.compareAtPrice),
  stock: product.stock === null ? '' : String(product.stock),
  weightGrams: String(product.weightGrams),
  optionsText: formatOptionsText(product.options),
  variants: variantDraftsFor(product.options, product),
  category: product.category ?? '',
  description: product.description,
  status: product.status,
  mediaId: product.imageIds[0] ?? '',
});

export interface ProductEditorProps {
  product: ProductSummary | null;
  saving: boolean;
  error: string | null;
  images: { id: string; label: string }[];
  onCancel: () => void;
  onSubmit: (draft: ProductDraft) => void;
}

export const ProductEditor = ({
  product,
  saving,
  error,
  images,
  onCancel,
  onSubmit,
}: ProductEditorProps) => {
  const t = useT();
  const [draft, setDraft] = useState<ProductDraft>(() =>
    product ? draftFor(product) : emptyDraft(),
  );
  const set = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]): void =>
    setDraft((current) => ({ ...current, [key]: value }));
  const options = parseOptionsText(draft.optionsText);

  const changeOptions = (text: string): void =>
    setDraft((current) => {
      const nextOptions = parseOptionsText(text);
      return {
        ...current,
        optionsText: text,
        variants: syncVariantDrafts(nextOptions, current.variants),
      };
    });

  const setVariant = (key: string, patch: Partial<VariantDraft>): void =>
    setDraft((current) => ({
      ...current,
      variants: current.variants.map((variant) =>
        variant.key === key ? { ...variant, ...patch } : variant,
      ),
    }));

  return (
    <Modal
      open
      title={product ? t('commerce.editProduct') : t('commerce.newProduct')}
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            disabled={saving || draft.title.trim() === '' || draft.slug.trim() === ''}
            onClick={() => onSubmit(draft)}
          >
            {saving ? t('common.loading') : t('common.save')}
          </Button>
        </>
      }
    >
      <div className="commerce-form">
        {error ? <Banner tone="danger" title={error} /> : null}
        <TextField
          label={t('commerce.productTitle')}
          value={draft.title}
          onChange={(event) => {
            set('title', event.target.value);
            if (!product) {
              const next = slugify(event.target.value, '');
              if (next) set('slug', next);
            }
          }}
        />
        <TextField
          label={t('commerce.slug')}
          value={draft.slug}
          onChange={(event) => set('slug', event.target.value.toLowerCase())}
          hint={t('commerce.slugHint')}
        />
        <div className="commerce-form__row">
          <TextField
            label={t('commerce.price')}
            value={draft.price}
            inputMode="decimal"
            onChange={(event) => set('price', event.target.value)}
            hint={t('commerce.priceHint')}
          />
          <TextField
            label={t('commerce.compareAt')}
            value={draft.compareAtPrice}
            inputMode="decimal"
            onChange={(event) => set('compareAtPrice', event.target.value)}
            hint={t('commerce.compareAtHint')}
          />
        </div>
        <div className="commerce-form__row">
          <TextField
            label={t('commerce.stock')}
            value={draft.stock}
            inputMode="numeric"
            disabled={options.length > 0}
            onChange={(event) => set('stock', event.target.value)}
            hint={options.length > 0 ? t('commerce.variantStockHint') : t('commerce.stockHint')}
          />
          <TextField
            label={t('commerce.weight')}
            value={draft.weightGrams}
            inputMode="numeric"
            onChange={(event) => set('weightGrams', event.target.value)}
            hint={t('commerce.weightHint')}
          />
        </div>
        <TextField
          label={t('commerce.category')}
          value={draft.category}
          onChange={(event) => set('category', event.target.value)}
        />
        <Textarea
          label={t('commerce.options')}
          value={draft.optionsText}
          rows={3}
          onChange={(event) => changeOptions(event.target.value)}
        />
        <p className="commerce-settings__hint">{t('commerce.optionsHint')}</p>
        {options.length > 0 ? (
          <div className="commerce-variants">
            <table className="commerce-variants__table">
              <thead>
                <tr>
                  <th>{t('commerce.variantCombination')}</th>
                  <th>{t('commerce.variantPrice')}</th>
                  <th>{t('commerce.variantCompareAt')}</th>
                  <th>{t('commerce.variantStock')}</th>
                  <th>{t('commerce.variantSku')}</th>
                </tr>
              </thead>
              <tbody>
                {draft.variants.map((variant) => (
                  <tr key={variant.key}>
                    <td>{combinationLabel(options, variant.values)}</td>
                    {(['price', 'compareAtPrice', 'stock', 'sku'] as const).map((field) => (
                      <td key={field}>
                        <input
                          className="commerce-variants__input"
                          value={variant[field]}
                          inputMode={
                            field === 'sku' ? undefined : field === 'stock' ? 'numeric' : 'decimal'
                          }
                          onChange={(event) =>
                            setVariant(variant.key, { [field]: event.target.value })
                          }
                          aria-label={`${combinationLabel(options, variant.values)} ${field}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="commerce-settings__hint">{t('commerce.variantPriceNote')}</p>
          </div>
        ) : null}
        <Select
          label={t('commerce.status')}
          value={draft.status}
          options={(['draft', 'active', 'archived'] as ProductStatus[]).map((value) => ({
            value,
            label: t(STATUS_KEYS[value]),
          }))}
          onChange={(event) => set('status', event.target.value as ProductStatus)}
        />
        <Select
          label={t('commerce.image')}
          value={draft.mediaId}
          options={[
            { value: '', label: t('commerce.noImage') },
            ...images.map((image) => ({ value: image.id, label: image.label })),
          ]}
          onChange={(event) => set('mediaId', event.target.value)}
        />
        <Textarea
          label={t('commerce.description')}
          value={draft.description}
          rows={4}
          onChange={(event) => set('description', event.target.value)}
        />
      </div>
    </Modal>
  );
};

const useProducts = (api: CommerceApi) => {
  const [items, setItems] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ProductStatus | 'all'>('all');

  const reload = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const page = await api.listProducts({
        limit: 100,
        ...(query.trim() ? { q: query.trim() } : {}),
        ...(status === 'all' ? {} : { status }),
      });
      setItems(page.items);
    } catch (caught) {
      setError(messageOf(caught) || translateFallback());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, [query, status]);

  return { items, loading, error, query, status, setQuery, setStatus, reload, setItems };
};

const translateFallback = (): string => translateNow('commerce.loadError');

export interface ProductsTabProps {
  api: CommerceApi;
  media?: MediaApi;
  canManage: boolean;
}

export const ProductsTab = ({ api, media, canManage }: ProductsTabProps) => {
  const t = useT();
  const toast = useToast();
  const state = useProducts(api);
  const [images, setImages] = useState<{ id: string; label: string }[]>([]);
  const [editing, setEditing] = useState<ProductSummary | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!media) return;
    void media
      .list({ limit: 100 })
      .then((page) =>
        setImages(
          page.items.map((item) => ({
            id: item.id,
            label: item.filename ?? item.alt ?? item.id,
          })),
        ),
      )
      .catch(() => setImages([]));
  }, [media]);

  const save = async (draft: ProductDraft): Promise<void> => {
    const price = parseBaht(draft.price);
    const compareAt = draft.compareAtPrice.trim() === '' ? null : parseBaht(draft.compareAtPrice);
    const stock = draft.stock.trim() === '' ? null : Number(draft.stock);
    if (price === null) {
      setFormError(t('commerce.priceInvalid'));
      return;
    }
    if (compareAt === null && draft.compareAtPrice.trim() !== '') {
      setFormError(t('commerce.priceInvalid'));
      return;
    }
    if (stock !== null && (!Number.isInteger(stock) || stock < 0)) {
      setFormError(t('commerce.stockInvalid'));
      return;
    }
    const weightGrams = Number(draft.weightGrams.trim() || '0');
    if (!Number.isInteger(weightGrams) || weightGrams < 0) {
      setFormError(t('commerce.weightInvalid'));
      return;
    }

    const options = parseOptionsText(draft.optionsText);
    const variants: ProductVariantInput[] = [];
    for (const row of draft.variants) {
      const variantPrice = row.price.trim() === '' ? null : parseBaht(row.price);
      const variantCompare =
        row.compareAtPrice.trim() === '' ? null : parseBaht(row.compareAtPrice);
      const variantStock = row.stock.trim() === '' ? null : Number(row.stock);
      if (row.price.trim() !== '' && variantPrice === null) {
        setFormError(t('commerce.priceInvalid'));
        return;
      }
      if (row.compareAtPrice.trim() !== '' && variantCompare === null) {
        setFormError(t('commerce.priceInvalid'));
        return;
      }
      if (variantStock !== null && (!Number.isInteger(variantStock) || variantStock < 0)) {
        setFormError(t('commerce.stockInvalid'));
        return;
      }
      variants.push({
        ...(row.id ? { id: row.id } : {}),
        options: row.values,
        sku: row.sku.trim() || null,
        price: variantPrice,
        compareAtPrice: variantCompare,
        stock: variantStock,
      });
    }
    if (options.length > 0 && variants.length === 0) {
      setFormError(t('commerce.variantsRequired'));
      return;
    }

    setSaving(true);
    setFormError(null);
    const input = {
      title: draft.title.trim(),
      slug: draft.slug.trim(),
      description: draft.description.trim(),
      price,
      compareAtPrice: compareAt,
      stock,
      weightGrams,
      options,
      variants,
      category: draft.category.trim() || null,
      status: draft.status,
      images: draft.mediaId ? [draft.mediaId] : [],
    };
    try {
      if (editing) await api.updateProduct(editing.id, input);
      else await api.createProduct(input);
      setEditing(undefined);
      await state.reload();
      toast.push({ title: t('commerce.saved'), tone: 'success' });
    } catch (caught) {
      setFormError(messageOf(caught) || t('common.genericError'));
    } finally {
      setSaving(false);
    }
  };

  const archive = async (product: ProductSummary): Promise<void> => {
    try {
      await api.archiveProduct(product.id);
      await state.reload();
      toast.push({
        title: t('commerce.deleted', { title: product.title }),
        tone: 'info',
        undo: {
          label: t('commerce.undo'),
          onClick: () => {
            void api
              .updateProduct(product.id, { status: 'active' })
              .then(() => state.reload())
              .catch(() => undefined);
          },
        },
      });
    } catch (caught) {
      toast.push({ title: messageOf(caught) || t('common.genericError'), tone: 'danger' });
    }
  };

  /** Brings an archived product back into the shop; undo archives it again. */
  const restore = async (product: ProductSummary): Promise<void> => {
    try {
      await api.updateProduct(product.id, { status: 'active' });
      await state.reload();
      toast.push({
        title: t('commerce.restored', { title: product.title }),
        tone: 'success',
        undo: {
          label: t('commerce.undo'),
          onClick: () => {
            void api
              .archiveProduct(product.id)
              .then(() => state.reload())
              .catch(() => undefined);
          },
        },
      });
    } catch (caught) {
      toast.push({ title: messageOf(caught) || t('common.genericError'), tone: 'danger' });
    }
  };

  return (
    <div className="commerce-view">
      <div className="commerce-toolbar">
        <TextField
          label={t('commerce.search')}
          value={state.query}
          placeholder={t('commerce.searchProducts')}
          onChange={(event) => state.setQuery(event.target.value)}
        />
        <Select
          label={t('commerce.status')}
          value={state.status}
          options={[
            { value: 'all', label: t('commerce.statusAll') },
            { value: 'active', label: t('commerce.statusActive') },
            { value: 'draft', label: t('commerce.statusDraft') },
            { value: 'archived', label: t('commerce.statusArchived') },
          ]}
          onChange={(event) => state.setStatus(event.target.value as ProductStatus | 'all')}
        />
        {canManage ? (
          <Button variant="primary" onClick={() => setEditing(null)}>
            {t('commerce.newProduct')}
          </Button>
        ) : null}
      </div>

      {state.error ? <Banner tone="danger" title={state.error} /> : null}

      {state.loading ? (
        <Skeleton shape="block" height={240} />
      ) : state.items.length === 0 ? (
        <EmptyState title={t('commerce.noProducts')} description={t('commerce.noProductsHint')} />
      ) : (
        <ul className="commerce-list">
          {state.items.map((product) => (
            <li className="commerce-row" key={product.id}>
              {product.images[0] ? (
                <img
                  className="commerce-row__image"
                  src={product.images[0]}
                  alt=""
                  width={72}
                  height={72}
                />
              ) : (
                <span className="commerce-row__image commerce-row__image--empty" aria-hidden="true">
                  <Icon name="shopping-bag" size={22} />
                </span>
              )}
              <div className="commerce-row__body">
                <p className="commerce-row__title">{product.title}</p>
                <p className="commerce-row__meta">
                  {t('commerce.priceValue', { price: formatBaht(product.price) })} ·{' '}
                  {product.stock === null
                    ? t('commerce.unlimited')
                    : t('commerce.stockLeft', { count: product.stock })}{' '}
                  · {t(STATUS_KEYS[product.status])}
                </p>
              </div>
              {canManage ? (
                <div className="commerce-row__actions">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(product)}>
                    {t('commerce.edit')}
                  </Button>
                  {product.status === 'archived' ? (
                    <Button variant="ghost" size="sm" onClick={() => void restore(product)}>
                      {t('commerce.restore')}
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => void archive(product)}>
                      {t('commerce.delete')}
                    </Button>
                  )}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {editing !== undefined ? (
        <ProductEditor
          product={editing}
          saving={saving}
          error={formError}
          images={images}
          onCancel={() => {
            setEditing(undefined);
            setFormError(null);
          }}
          onSubmit={(draft) => void save(draft)}
        />
      ) : null}
    </div>
  );
};

/* ------------------------------------------------------------------ orders */

const useOrders = (api: CommerceApi) => {
  const [items, setItems] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<OrderStatus | 'all'>('all');

  const reload = async (): Promise<void> => {
    setLoading(true);
    try {
      const page = await api.listOrders({ limit: 100, ...(status === 'all' ? {} : { status }) });
      setItems(page.items);
      setError(null);
    } catch (caught) {
      setError(messageOf(caught) || translateFallback());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, [status]);

  return { items, loading, error, status, setStatus, reload };
};

export interface OrdersTabProps {
  api: CommerceApi;
  canManage: boolean;
}

export const OrdersTab = ({ api, canManage }: OrdersTabProps) => {
  const t = useT();
  const toast = useToast();
  const state = useOrders(api);
  const [selected, setSelected] = useState<OrderDetail | null>(null);
  const [tracking, setTracking] = useState('');
  const [busy, setBusy] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundRestock, setRefundRestock] = useState(true);

  const open = async (order: OrderSummary): Promise<void> => {
    setSelected(null);
    setTracking(order.trackingNumber ?? '');
    try {
      setSelected(await api.getOrder(order.id));
    } catch (caught) {
      toast.push({ title: messageOf(caught) || t('common.genericError'), tone: 'danger' });
    }
  };

  const review = async (status: ReviewSlipInput['status']): Promise<void> => {
    if (!selected) return;
    setBusy(true);
    try {
      const updated = await api.reviewSlip(selected.id, { status, note: '' });
      setSelected(updated);
      await state.reload();
      toast.push({
        title: t(status === 'verified' ? 'commerce.slipApproved' : 'commerce.slipRejected'),
        tone: 'success',
      });
    } catch (caught) {
      toast.push({ title: messageOf(caught) || t('common.genericError'), tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const move = async (status: OrderStatus): Promise<void> => {
    if (!selected) return;
    setBusy(true);
    try {
      const updated = await api.updateOrderStatus(selected.id, {
        status,
        ...(status === 'shipped' && tracking.trim() ? { trackingNumber: tracking.trim() } : {}),
      });
      setSelected(updated);
      await state.reload();
      toast.push({ title: t('commerce.orderUpdated'), tone: 'success' });
    } catch (caught) {
      toast.push({ title: messageOf(caught) || t('common.genericError'), tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const openRefund = (order: OrderDetail): void => {
    setRefundAmount(formatBaht(order.total - order.refundedAmount));
    setRefundReason('');
    setRefundRestock(true);
    setRefundOpen(true);
  };

  const refund = async (): Promise<void> => {
    if (!selected) return;
    const amount = parseBaht(refundAmount);
    if (amount === null) {
      toast.push({ title: t('commerce.refundFailed'), tone: 'danger' });
      return;
    }
    setBusy(true);
    try {
      const updated = await api.refundOrder(selected.id, {
        amount,
        reason: refundReason.trim(),
        restock: refundRestock,
      });
      setSelected(updated);
      setRefundOpen(false);
      await state.reload();
      toast.push({ title: t('commerce.refundedToast'), tone: 'success' });
    } catch (caught) {
      toast.push({ title: messageOf(caught) || t('commerce.refundFailed'), tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const actions = useMemo(() => {
    if (!selected || !canManage) return [] as { label: string; status: OrderStatus }[];
    if (selected.status === 'pending') {
      return [
        { label: t('commerce.markPaid'), status: 'paid' as const },
        { label: t('commerce.cancelOrder'), status: 'cancelled' as const },
      ];
    }
    if (selected.status === 'paid') {
      return [
        { label: t('commerce.markShipped'), status: 'shipped' as const },
        { label: t('commerce.markCompleted'), status: 'completed' as const },
        { label: t('commerce.cancelOrder'), status: 'cancelled' as const },
      ];
    }
    if (selected.status === 'shipped') {
      return [{ label: t('commerce.markCompleted'), status: 'completed' as const }];
    }
    return [];
  }, [selected, canManage, t]);

  return (
    <div className="commerce-view">
      <div className="commerce-toolbar">
        <Select
          label={t('commerce.orderStatus')}
          value={state.status}
          options={[
            { value: 'all', label: t('commerce.statusAll') },
            ...(
              ['pending', 'paid', 'shipped', 'completed', 'cancelled', 'refunded'] as OrderStatus[]
            ).map((value) => ({ value, label: t(ORDER_STATUS_KEYS[value]) })),
          ]}
          onChange={(event) => state.setStatus(event.target.value as OrderStatus | 'all')}
        />
      </div>

      {state.error ? <Banner tone="danger" title={state.error} /> : null}

      {state.loading ? (
        <Skeleton shape="block" height={240} />
      ) : state.items.length === 0 ? (
        <EmptyState title={t('commerce.noOrders')} description={t('commerce.noOrdersHint')} />
      ) : (
        <ul className="commerce-list">
          {state.items.map((order) => (
            <li key={order.id}>
              <button
                className="commerce-row commerce-row--button"
                type="button"
                onClick={() => void open(order)}
              >
                <div className="commerce-row__body">
                  <p className="commerce-row__title">
                    {order.number} · {order.customerName}
                  </p>
                  <p className="commerce-row__meta">
                    {formatDate(order.createdAt)} · {t(ORDER_STATUS_KEYS[order.status])} ·{' '}
                    {t('commerce.itemCount', { count: order.itemsCount })}
                  </p>
                </div>
                <span className="commerce-row__total">
                  {t('commerce.priceValue', { price: formatBaht(order.total) })}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected ? (
        <Modal
          open
          title={t('commerce.orderTitle', { number: selected.number })}
          onClose={() => setSelected(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setSelected(null)}>
                {t('common.close')}
              </Button>
              {canManage && selected && canRefundOrder(selected.status) ? (
                <Button variant="secondary" disabled={busy} onClick={() => openRefund(selected)}>
                  {t('commerce.refundOrder')}
                </Button>
              ) : null}
              {actions.map((action) => (
                <Button
                  key={action.status}
                  variant={action.status === 'cancelled' ? 'ghost' : 'primary'}
                  disabled={busy}
                  onClick={() => void move(action.status)}
                >
                  {action.label}
                </Button>
              ))}
            </>
          }
        >
          <div className="commerce-order">
            <p className="commerce-order__meta">
              {t(ORDER_STATUS_KEYS[selected.status])} ·{' '}
              {selected.paymentMethod === 'cod' ? t('commerce.cod') : t('commerce.promptpay')} ·{' '}
              {formatDate(selected.createdAt)}
            </p>
            {selected.refundedAmount > 0 ? (
              <p className="commerce-order__note">
                {t('commerce.refundedSummary', { amount: formatBaht(selected.refundedAmount) })}
                {selected.refundReason ? ` — ${selected.refundReason}` : ''}
              </p>
            ) : null}
            <div className="commerce-order__customer">
              <p>{selected.customer.name}</p>
              <p>{selected.customer.phone}</p>
              <p>
                {selected.customer.address} {selected.customer.subdistrict}{' '}
                {selected.customer.district} {selected.customer.province}{' '}
                {selected.customer.postcode}
              </p>
              {selected.note ? <p className="commerce-order__note">{selected.note}</p> : null}
            </div>
            <ul className="commerce-order__items">
              {selected.items.map((item) => (
                <li
                  key={`${item.productId ?? item.title}-${item.variantId ?? ''}-${item.quantity}`}
                >
                  <span>
                    {item.title}
                    {item.variantLabel ? ` (${item.variantLabel})` : ''} × {item.quantity}
                  </span>
                  <span>{formatBaht(item.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="commerce-order__totals">
              <div>
                <dt>{t('commerce.subtotal')}</dt>
                <dd>{formatBaht(selected.subtotal)}</dd>
              </div>
              <div>
                <dt>{t('commerce.shipping')}</dt>
                <dd>{formatBaht(selected.shippingFee)}</dd>
              </div>
              <div className="commerce-order__grand">
                <dt>{t('commerce.total')}</dt>
                <dd>{formatBaht(selected.total)}</dd>
              </div>
            </dl>
            {selected.slip ? (
              <div className="commerce-order__slip">
                <p>
                  {t('commerce.slip')} · {formatBaht(selected.slip.amount)} บาท · อ้างอิง{' '}
                  {selected.slip.reference}
                </p>
                <p className="commerce-settings__hint">
                  {t('commerce.slip')}:{' '}
                  {selected.slip.status === 'verified'
                    ? t('commerce.slipStatusVerified')
                    : selected.slip.status === 'rejected'
                      ? t('commerce.slipStatusRejected')
                      : t('commerce.slipStatusPending')}
                  {selected.slip.note ? ` · ${selected.slip.note}` : ''}
                </p>
                {selected.slip.imageUrl ? (
                  <a href={selected.slip.imageUrl} target="_blank" rel="noreferrer">
                    {t('commerce.slipOpen')}
                  </a>
                ) : null}
                {canManage && selected.slip.status === 'pending_review' ? (
                  <div className="commerce-order__slip-actions">
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={busy}
                      onClick={() => void review('verified')}
                    >
                      {t('commerce.slipApprove')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => void review('rejected')}
                    >
                      {t('commerce.slipReject')}
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
            {selected.status === 'paid' || selected.status === 'shipped' ? (
              <TextField
                label={t('commerce.tracking')}
                value={tracking}
                onChange={(event) => setTracking(event.target.value)}
              />
            ) : null}
          </div>
        </Modal>
      ) : null}

      {selected && refundOpen ? (
        <Modal
          open
          size="sm"
          title={t('commerce.refundTitle')}
          description={t('commerce.refundHint')}
          onClose={() => setRefundOpen(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setRefundOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button variant="primary" disabled={busy} onClick={() => void refund()}>
                {t('commerce.refundConfirm')}
              </Button>
            </>
          }
        >
          <div className="commerce-order">
            <TextField
              label={t('commerce.refundAmount')}
              inputMode="decimal"
              value={refundAmount}
              onChange={(event) => setRefundAmount(event.target.value)}
            />
            <p className="commerce-order__meta">
              {t('commerce.refundFullAmount', {
                amount: formatBaht(selected.total - selected.refundedAmount),
              })}
            </p>
            <Textarea
              label={t('commerce.refundReason')}
              value={refundReason}
              onChange={(event) => setRefundReason(event.target.value)}
            />
            <Switch
              label={t('commerce.refundRestock')}
              checked={refundRestock}
              onChange={setRefundRestock}
            />
          </div>
        </Modal>
      ) : null}
    </div>
  );
};

/* ---------------------------------------------------------------- settings */

const zonesToText = (zones: CommerceSettings['shippingZones']): string =>
  zones.map((zone) => `${zone.provinces.join(', ')} = ${formatBaht(zone.fee)}`).join('\n');

const textToZones = (text: string): CommerceSettings['shippingZones'] | null => {
  const zones: CommerceSettings['shippingZones'] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const separator = trimmed.indexOf('=');
    if (separator <= 0) return null;
    const provinces = trimmed
      .slice(0, separator)
      .split(',')
      .map((province) => province.trim())
      .filter((province) => province.length > 0);
    const fee = parseBaht(trimmed.slice(separator + 1));
    if (provinces.length === 0 || fee === null) return null;
    zones.push({ label: provinces.join(', '), provinces, fee });
  }
  return zones;
};

export interface ShopSettingsTabProps {
  api: CommerceApi;
  canManage: boolean;
}

export const ShopSettingsTab = ({ api, canManage }: ShopSettingsTabProps) => {
  const t = useT();
  const toast = useToast();
  const [settings, setSettings] = useState<CommerceSettings | null>(null);
  const [promptPayId, setPromptPayId] = useState('');
  const [shippingFee, setShippingFee] = useState('');
  const [threshold, setThreshold] = useState('');
  const [perKg, setPerKg] = useState('');
  const [zonesText, setZonesText] = useState('');
  const [connect, setConnect] = useState<ConnectStatus | null>(null);
  const [bank, setBank] = useState<BankConnection | null>(null);
  const [bankClientId, setBankClientId] = useState('');
  const [bankSecret, setBankSecret] = useState('');
  const [bankWebhookSecret, setBankWebhookSecret] = useState('');
  const [bankApiKey, setBankApiKey] = useState('');
  const [bankBaseUrl, setBankBaseUrl] = useState('');
  const [bankSandbox, setBankSandbox] = useState(false);
  const [bankAccount, setBankAccount] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAutoVerify, setBankAutoVerify] = useState(true);
  const [bankWorking, setBankWorking] = useState<'save' | 'test' | null>(null);
  const [webhook, setWebhook] = useState<OrderWebhookView | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [webhookEvents, setWebhookEvents] = useState<OrderWebhookEvent[]>([
    ...ORDER_WEBHOOK_EVENTS,
  ]);
  const [webhookWorking, setWebhookWorking] = useState<'save' | 'test' | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api
      .getSettings()
      .then((loaded) => {
        setSettings(loaded);
        setPromptPayId(loaded.promptPayId ?? '');
        setShippingFee(formatBaht(loaded.shippingFee));
        setThreshold(
          loaded.freeShippingThreshold === null ? '' : formatBaht(loaded.freeShippingThreshold),
        );
        setPerKg(formatBaht(loaded.shippingPerKgFee));
        setZonesText(zonesToText(loaded.shippingZones));
      })
      .catch((caught) => setError(messageOf(caught) || translateFallback()));
    void api
      .getConnectStatus()
      .then(setConnect)
      .catch(() => setConnect(null));
    void api
      .getBankConnection()
      .then((loaded) => {
        setBank(loaded);
        setBankClientId(loaded.clientId);
        setBankBaseUrl(loaded.baseUrl);
        setBankSandbox(loaded.sandbox);
        setBankAccountName(loaded.accountName);
        setBankAutoVerify(loaded.autoVerifySlips);
      })
      .catch(() => setBank(null));
    void api
      .getWebhook()
      .then((loaded) => {
        setWebhook(loaded);
        setWebhookUrl(loaded.url);
        setWebhookEvents(loaded.events);
      })
      .catch(() => setWebhook(null));
  }, [api]);

  const save = async (): Promise<void> => {
    const fee = parseBaht(shippingFee || '0');
    const free = threshold.trim() === '' ? null : parseBaht(threshold);
    const weightFee = parseBaht(perKg || '0');
    const zones = textToZones(zonesText);
    if (
      fee === null ||
      weightFee === null ||
      zones === null ||
      (free === null && threshold.trim() !== '')
    ) {
      setError(t('commerce.priceInvalid'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateSettings({
        promptPayId: promptPayId.trim() || null,
        shippingFee: fee,
        freeShippingThreshold: free,
        shippingPerKgFee: weightFee,
        shippingZones: zones,
      });
      setSettings(updated);
      toast.push({ title: t('commerce.saved'), tone: 'success' });
    } catch (caught) {
      setError(messageOf(caught) || t('common.genericError'));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (
    key: 'promptpay' | 'cod' | 'card' | 'bbl',
    checked: boolean,
  ): Promise<void> => {
    if (!settings) return;
    try {
      const updated = await api.updateSettings({
        payments: { ...settings.payments, [key]: checked },
      });
      setSettings(updated);
    } catch (caught) {
      setError(messageOf(caught) || t('common.genericError'));
    }
  };

  const startConnect = async (): Promise<void> => {
    try {
      const link = await api.startConnectOnboarding();
      setConnect({ accountId: link.accountId, chargesEnabled: false, payoutsEnabled: false });
      if (link.url.startsWith('http')) window.open(link.url, '_blank', 'noopener');
    } catch (caught) {
      setError(messageOf(caught) || t('common.genericError'));
    }
  };

  const refreshConnect = async (): Promise<void> => {
    try {
      setConnect(await api.refreshConnect());
      toast.push({ title: t('commerce.connectUpdated'), tone: 'success' });
    } catch (caught) {
      setError(messageOf(caught) || t('common.genericError'));
    }
  };

  const saveBank = async (): Promise<void> => {
    setBankWorking('save');
    setError(null);
    try {
      const updated = await api.updateBankSettings({
        clientId: bankClientId.trim(),
        ...(bankSecret.trim() ? { clientSecret: bankSecret.trim() } : {}),
        ...(bankWebhookSecret.trim() ? { webhookSecret: bankWebhookSecret.trim() } : {}),
        ...(bankApiKey.trim() ? { apiKey: bankApiKey.trim() } : {}),
        baseUrl: bankBaseUrl.trim(),
        sandbox: bankSandbox,
        accountName: bankAccountName.trim(),
        autoVerifySlips: bankAutoVerify,
        ...(bankAccount.trim() ? { accountNumber: bankAccount.trim() } : {}),
      });
      setBank(updated);
      setBankSecret('');
      setBankWebhookSecret('');
      setBankApiKey('');
      setBankAccount('');
      toast.push({ title: t('commerce.bankSaved'), tone: 'success' });
    } catch (caught) {
      setError(messageOf(caught) || t('commerce.bankTestFailed'));
    } finally {
      setBankWorking(null);
    }
  };

  const testBank = async (): Promise<void> => {
    setBankWorking('test');
    setError(null);
    try {
      setBank(await api.testBankConnection());
      toast.push({ title: t('commerce.bankChecked'), tone: 'success' });
    } catch (caught) {
      setError(messageOf(caught) || t('commerce.bankTestFailed'));
    } finally {
      setBankWorking(null);
    }
  };

  const saveWebhook = async (): Promise<void> => {
    setWebhookWorking('save');
    setError(null);
    try {
      const updated = await api.updateWebhook({
        url: webhookUrl.trim(),
        events: webhookEvents,
        ...(webhookSecret.trim() ? { secret: webhookSecret.trim() } : {}),
      });
      setWebhook(updated);
      setWebhookSecret('');
      toast.push({ title: t('commerce.webhookSaved'), tone: 'success' });
    } catch (caught) {
      setError(messageOf(caught) || t('common.genericError'));
    } finally {
      setWebhookWorking(null);
    }
  };

  const testWebhook = async (): Promise<void> => {
    setWebhookWorking('test');
    setError(null);
    try {
      const result = await api.testWebhook();
      if (result.delivered) {
        toast.push({ title: t('commerce.webhookDelivered'), tone: 'success' });
      } else {
        setError(result.error ?? t('commerce.webhookFailed'));
      }
    } catch (caught) {
      setError(messageOf(caught) || t('commerce.webhookFailed'));
    } finally {
      setWebhookWorking(null);
    }
  };

  const toggleWebhookEvent = (event: OrderWebhookEvent, checked: boolean): void => {
    setWebhookEvents((current) =>
      checked ? [...new Set([...current, event])] : current.filter((entry) => entry !== event),
    );
  };

  if (!settings) return <Skeleton shape="block" height={240} />;

  const badge = !bank?.connected
    ? { tone: '', label: t('commerce.bankStatusOff') }
    : bank.sandbox
      ? { tone: 'commerce-badge--warning', label: t('commerce.bankStatusSandbox') }
      : { tone: 'commerce-badge--success', label: t('commerce.bankStatusOn') };

  return (
    <div className="commerce-settings-page">
      {error ? <Banner tone="danger" title={error} /> : null}

      <Card className="commerce-section">
        <header className="commerce-section__header">
          <h2 className="commerce-section__title">{t('commerce.settingsTitle')}</h2>
          <p className="commerce-section__hint">{t('commerce.settingsHint')}</p>
        </header>

        <div className="commerce-section__fields">
          <TextField
            label={t('commerce.promptPayId')}
            value={promptPayId}
            disabled={!canManage}
            placeholder="0812345678"
            hint={t('commerce.promptPayHint')}
            onChange={(event) => setPromptPayId(event.target.value)}
          />
          <div className="commerce-form__row">
            <TextField
              label={t('commerce.shippingFee')}
              value={shippingFee}
              disabled={!canManage}
              inputMode="decimal"
              onChange={(event) => setShippingFee(event.target.value)}
            />
            <TextField
              label={t('commerce.freeThreshold')}
              value={threshold}
              disabled={!canManage}
              inputMode="decimal"
              hint={t('commerce.freeThresholdHint')}
              onChange={(event) => setThreshold(event.target.value)}
            />
          </div>
          <TextField
            label={t('commerce.shippingPerKg')}
            value={perKg}
            disabled={!canManage}
            inputMode="decimal"
            hint={t('commerce.shippingPerKgHint')}
            onChange={(event) => setPerKg(event.target.value)}
          />
          <Textarea
            label={t('commerce.shippingZones')}
            value={zonesText}
            rows={3}
            disabled={!canManage}
            onChange={(event) => setZonesText(event.target.value)}
          />
          <p className="commerce-section__hint">{t('commerce.shippingZonesHint')}</p>
        </div>

        <div className="commerce-switch-grid">
          <Switch
            label={t('commerce.promptpay')}
            description={t('commerce.promptpayDesc')}
            checked={settings.payments.promptpay}
            disabled={!canManage}
            onChange={(checked) => void toggle('promptpay', checked)}
          />
          <Switch
            label={t('commerce.bblPayment')}
            description={t('commerce.bblPaymentDesc')}
            checked={settings.payments.bbl}
            disabled={!canManage}
            onChange={(checked) => void toggle('bbl', checked)}
          />
          <Switch
            label={t('commerce.card')}
            description={t('commerce.cardDesc')}
            checked={settings.payments.card}
            disabled={!canManage}
            onChange={(checked) => void toggle('card', checked)}
          />
          <Switch
            label={t('commerce.cod')}
            description={t('commerce.codDesc')}
            checked={settings.payments.cod}
            disabled={!canManage}
            onChange={(checked) => void toggle('cod', checked)}
          />
        </div>
      </Card>

      <Card className="commerce-section">
        <header className="commerce-section__header">
          <h2 className="commerce-section__title">{t('commerce.connectTitle')}</h2>
          <p className="commerce-section__hint">
            {connect?.accountId
              ? connect.chargesEnabled && connect.payoutsEnabled
                ? t('commerce.connectReady')
                : t('commerce.connectPending')
              : t('commerce.connectNone')}
          </p>
          <p className="commerce-section__hint">
            {t('commerce.connectFee', { percent: settings.platformFeePercent })}
          </p>
        </header>
        {canManage ? (
          <div className="commerce-section__actions">
            <Button variant="secondary" onClick={() => void startConnect()}>
              {connect?.accountId ? t('commerce.connectAgain') : t('commerce.connectButton')}
            </Button>
            {connect?.accountId ? (
              <Button variant="ghost" onClick={() => void refreshConnect()}>
                {t('commerce.connectRefresh')}
              </Button>
            ) : null}
          </div>
        ) : null}
      </Card>

      <Card className="commerce-section">
        <header className="commerce-section__header commerce-section__header--split">
          <div className="commerce-section__heading">
            <h2 className="commerce-section__title">{t('commerce.bankTitle')}</h2>
            <p className="commerce-section__hint">{t('commerce.bankHint')}</p>
          </div>
          <span className={`commerce-badge ${badge.tone}`.trim()}>{badge.label}</span>
        </header>

        {bank?.accountNumber || bank?.lastCheckedAt ? (
          <p className="commerce-bank__meta">
            {bank.accountNumber ? (
              <span>
                {t('commerce.bankAccountCurrent')} <strong>{bank.accountNumber}</strong>
              </span>
            ) : null}
            {bank.lastCheckedAt ? <span>· {formatDate(bank.lastCheckedAt)}</span> : null}
          </p>
        ) : null}

        <div className="commerce-bank__group">
          <h3 className="commerce-bank__group-title">{t('commerce.bankGroupCredentials')}</h3>
          <div className="commerce-form__row">
            <TextField
              label={t('commerce.bankClientId')}
              value={bankClientId}
              disabled={!canManage}
              onChange={(event) => setBankClientId(event.target.value)}
            />
            <TextField
              label={t('commerce.bankClientSecret')}
              type="password"
              autoComplete="new-password"
              value={bankSecret}
              disabled={!canManage}
              placeholder={bank?.hasClientSecret ? t('commerce.bankSecretKept') : ''}
              hint={t('commerce.bankSecretHint')}
              onChange={(event) => setBankSecret(event.target.value)}
            />
          </div>
        </div>

        <div className="commerce-bank__group">
          <h3 className="commerce-bank__group-title">{t('commerce.bankGroupAccount')}</h3>
          <div className="commerce-form__row">
            <TextField
              label={t('commerce.bankAccount')}
              value={bankAccount}
              inputMode="numeric"
              disabled={!canManage}
              hint={
                bank?.accountNumber
                  ? `${t('commerce.bankAccountCurrent')} ${bank.accountNumber}`
                  : undefined
              }
              onChange={(event) => setBankAccount(event.target.value)}
            />
            <TextField
              label={t('commerce.bankAccountName')}
              value={bankAccountName}
              disabled={!canManage}
              onChange={(event) => setBankAccountName(event.target.value)}
            />
          </div>
        </div>

        <div className="commerce-bank__group">
          <h3 className="commerce-bank__group-title">{t('commerce.bankGroupSecurity')}</h3>
          <div className="commerce-form__row">
            <TextField
              label={t('commerce.bankWebhookSecret')}
              type="password"
              autoComplete="new-password"
              value={bankWebhookSecret}
              disabled={!canManage}
              placeholder={bank?.hasWebhookSecret ? t('commerce.bankSecretKept') : ''}
              hint={t('commerce.bankWebhookHint')}
              onChange={(event) => setBankWebhookSecret(event.target.value)}
            />
            <TextField
              label={t('commerce.bankApiKey')}
              type="password"
              autoComplete="new-password"
              value={bankApiKey}
              disabled={!canManage}
              placeholder={bank?.apiKeySet ? t('commerce.bankSecretKept') : ''}
              onChange={(event) => setBankApiKey(event.target.value)}
            />
          </div>
        </div>

        <div className="commerce-bank__group">
          <h3 className="commerce-bank__group-title">{t('commerce.bankGroupAdvanced')}</h3>
          <TextField
            label={t('commerce.bankBaseUrl')}
            value={bankBaseUrl}
            placeholder="https://api.bangkokbank.com"
            disabled={!canManage}
            onChange={(event) => setBankBaseUrl(event.target.value)}
          />
          <div className="commerce-switch-grid">
            <Switch
              label={t('commerce.bankSandbox')}
              description={t('commerce.bankSandboxDesc')}
              checked={bankSandbox}
              disabled={!canManage}
              onChange={setBankSandbox}
            />
            <Switch
              label={t('commerce.bankAutoVerify')}
              description={t('commerce.bankAutoVerifyDesc')}
              checked={bankAutoVerify}
              disabled={!canManage}
              onChange={setBankAutoVerify}
            />
          </div>
        </div>

        {canManage ? (
          <div className="commerce-section__actions">
            <Button
              variant="secondary"
              disabled={bankWorking !== null}
              onClick={() => void saveBank()}
            >
              {bankWorking === 'save' ? t('common.loading') : t('commerce.bankSave')}
            </Button>
            {bank?.hasClientSecret ? (
              <Button
                variant="ghost"
                disabled={bankWorking !== null}
                onClick={() => void testBank()}
              >
                {bankWorking === 'test' ? t('common.loading') : t('commerce.bankTest')}
              </Button>
            ) : null}
          </div>
        ) : null}
      </Card>

      <Card className="commerce-section">
        <header className="commerce-section__header">
          <h2 className="commerce-section__title">{t('commerce.webhookTitle')}</h2>
          <p className="commerce-section__hint">{t('commerce.webhookHint')}</p>
        </header>

        <div className="commerce-section__fields">
          <TextField
            label={t('commerce.webhookUrl')}
            value={webhookUrl}
            disabled={!canManage}
            placeholder="https://example.com/lumio/orders"
            hint={t('commerce.webhookUrlHint')}
            onChange={(event) => setWebhookUrl(event.target.value)}
          />
          <TextField
            label={t('commerce.webhookSecret')}
            type="password"
            autoComplete="new-password"
            value={webhookSecret}
            disabled={!canManage}
            placeholder={webhook?.secretSet ? t('commerce.bankSecretKept') : ''}
            hint={t('commerce.webhookSecretHint')}
            onChange={(event) => setWebhookSecret(event.target.value)}
          />
        </div>

        <div className="commerce-switch-grid">
          <Switch
            label={t('commerce.webhookOrderCreated')}
            description={t('commerce.webhookOrderCreatedDesc')}
            checked={webhookEvents.includes('order.created')}
            disabled={!canManage}
            onChange={(checked) => toggleWebhookEvent('order.created', checked)}
          />
          <Switch
            label={t('commerce.webhookOrderPaid')}
            description={t('commerce.webhookOrderPaidDesc')}
            checked={webhookEvents.includes('order.paid')}
            disabled={!canManage}
            onChange={(checked) => toggleWebhookEvent('order.paid', checked)}
          />
          <Switch
            label={t('commerce.webhookOrderStatus')}
            description={t('commerce.webhookOrderStatusDesc')}
            checked={webhookEvents.includes('order.status')}
            disabled={!canManage}
            onChange={(checked) => toggleWebhookEvent('order.status', checked)}
          />
        </div>

        <p className="commerce-section__hint">{t('commerce.webhookSignatureHint')}</p>

        {canManage ? (
          <div className="commerce-section__actions">
            <Button
              variant="secondary"
              disabled={webhookWorking !== null}
              onClick={() => void saveWebhook()}
            >
              {webhookWorking === 'save' ? t('common.loading') : t('commerce.webhookSave')}
            </Button>
            <Button
              variant="ghost"
              disabled={webhookWorking !== null || !webhook?.enabled}
              onClick={() => void testWebhook()}
            >
              {webhookWorking === 'test' ? t('common.loading') : t('commerce.webhookTest')}
            </Button>
          </div>
        ) : null}
      </Card>

      {canManage ? (
        <div className="commerce-settings-footer">
          <Button variant="primary" disabled={saving} onClick={() => void save()}>
            {saving ? t('common.loading') : t('common.save')}
          </Button>
        </div>
      ) : null}
    </div>
  );
};


export interface CommercePageProps {
  api: CommerceApi;
  media?: MediaApi;
  tab: CommerceTab;
  canManage: boolean;
  onNavigate: (path: string) => void;
}

export const CommercePage = ({ api, media, tab, canManage, onNavigate }: CommercePageProps) => {
  const t = useT();

  return (
    <div className="commerce-page">
      <header className="commerce-header">
        <div>
          <h1 className="commerce-header__title">{t('nav.shop')}</h1>
          <p className="commerce-header__subtitle">{t('commerce.subtitle')}</p>
        </div>
      </header>

      <nav className="commerce-tabs" aria-label={t('nav.shop')}>
        {(['products', 'orders', 'settings'] as CommerceTab[]).map((entry) => (
          <button
            key={entry}
            type="button"
            className="commerce-tab__link"
            aria-current={entry === tab ? 'page' : undefined}
            onClick={() => onNavigate(`/commerce/${entry}`)}
          >
            {t(
              entry === 'products'
                ? 'nav.products'
                : entry === 'orders'
                  ? 'nav.orders'
                  : 'commerce.settings',
            )}
          </button>
        ))}
      </nav>

      {tab === 'products' ? <ProductsTab api={api} media={media} canManage={canManage} /> : null}
      {tab === 'orders' ? <OrdersTab api={api} canManage={canManage} /> : null}
      {tab === 'settings' ? <ShopSettingsTab api={api} canManage={canManage} /> : null}
    </div>
  );
};
