import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  BOOKING_STATUSES,
  BOOKING_STATUS_LABELS,
  bookingRangeLabel,
  DEFAULT_BOOKING_SETTINGS,
  formatMembershipPrice,
  type Booking,
  type BookingService,
  type BookingServiceInput,
  type BookingSettings,
  type BookingStatus,
} from '@lumio/shared';
import {
  Banner,
  Button,
  Card,
  EmptyState,
  Icon,
  Modal,
  PageHeader,
  Select,
  Skeleton,
  Switch,
  TextField,
  useT,
  useToast,
} from '@lumio/ui';
import { ApiError } from '../api-error.js';
import type { BookingApi } from './api.js';
import './booking.css';

export interface BookingsPageProps {
  api: BookingApi;
  canManage: boolean;
  demo?: boolean;
  headerTabs?: ReactNode;
}

const THAI_DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

const messageOf = (error: unknown, fallback: string): string =>
  error instanceof ApiError ? error.message : fallback;

const baht = (satang: number): string => (satang / 100).toFixed(0);

const emptyService = (): BookingServiceInput => ({
  name: '',
  description: '',
  durationMinutes: 60,
  price: 0,
  active: true,
  sort: 0,
});

/**
 * "เติบโต › การจองคิว" (docs/PROGRESS.md "งานนอก MVP"): services customers can
 * pick, the weekly opening hours, and the appointments that came in.
 */
export const BookingsPage = ({ api, canManage, demo = false, headerTabs }: BookingsPageProps) => {
  const t = useT();
  const toast = useToast();
  const [settings, setSettings] = useState<BookingSettings>(DEFAULT_BOOKING_SETTINGS);
  const [services, setServices] = useState<BookingService[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [busy, setBusy] = useState(false);
  const [date, setDate] = useState('');
  const [status, setStatus] = useState<BookingStatus | ''>('');
  const [editing, setEditing] = useState<{ service: BookingService | null; input: BookingServiceInput } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<BookingService | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [loadedSettings, loadedServices, loadedBookings] = await Promise.all([
        api.settings(),
        api.services(),
        api.bookings({
          ...(date ? { date } : {}),
          ...(status ? { status } : {}),
          limit: 50,
        }),
      ]);
      setSettings(loadedSettings);
      setServices(loadedServices);
      setBookings(loadedBookings.items);
    } catch (loadError) {
      setError(messageOf(loadError, t('booking.loadError')));
    } finally {
      setLoading(false);
    }
  }, [api, date, status, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveSettings = async (): Promise<void> => {
    setSavingSettings(true);
    setError(null);
    try {
      setSettings(await api.updateSettings(settings));
      toast.push({ tone: 'success', title: t('booking.saved') });
    } catch (saveError) {
      setError(messageOf(saveError, t('common.genericError')));
    } finally {
      setSavingSettings(false);
    }
  };

  const saveService = async (): Promise<void> => {
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      if (editing.service) {
        const updated = await api.updateService(editing.service.id, editing.input);
        setServices((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await api.createService(editing.input);
        setServices((current) => [...current, created]);
      }
      setEditing(null);
    } catch (saveError) {
      setError(messageOf(saveError, t('common.genericError')));
    } finally {
      setBusy(false);
    }
  };

  const deleteService = async (service: BookingService): Promise<void> => {
    setBusy(true);
    try {
      await api.deleteService(service.id);
      setServices((current) => current.filter((item) => item.id !== service.id));
    } catch (deleteError) {
      toast.push({ tone: 'danger', title: messageOf(deleteError, t('common.genericError')) });
    } finally {
      setBusy(false);
    }
  };

  const setStatusOf = async (booking: Booking, next: BookingStatus): Promise<void> => {
    setBusy(true);
    try {
      const updated = await api.setStatus(booking.id, next);
      setBookings((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      toast.push({
        tone: 'success',
        title: next === 'cancelled' ? t('booking.cancelled') : t('booking.confirmed'),
        description: booking.customerName,
      });
    } catch (statusError) {
      toast.push({ tone: 'danger', title: messageOf(statusError, t('common.genericError')) });
    } finally {
      setBusy(false);
    }
  };

  const updateDay = (weekday: number, patch: Partial<BookingSettings['days'][number]>): void => {
    setSettings((current) => ({
      ...current,
      days: current.days.map((day) =>
        day.weekday === weekday ? { ...day, ...patch } : day,
      ),
    }));
  };

  return (
    <div className="booking-page">
      <PageHeader
        eyebrow={t('nav.growth')}
        title={t('booking.title')}
        description={t('booking.subtitle')}
        tabs={headerTabs}
      />

      {demo ? <Banner tone="info" title={t('booking.demoHint')} /> : null}
      <Banner tone="info" title={t('booking.publicHint')} />

      {loading ? (
        <Skeleton shape="block" height={240} />
      ) : error && services.length === 0 ? (
        <EmptyState
          tone="error"
          title={t('booking.loadError')}
          description={error}
          action={
            <Button variant="secondary" onClick={() => void load()}>
              {t('common.retry')}
            </Button>
          }
        />
      ) : (
        <>
          <Card className="settings-card">
            <h2 className="settings-card__title">{t('booking.calendarTitle')}</h2>
            <div className="settings-switch">
              <Switch
                label={t('booking.enabled')}
                description={t('booking.enabledHint')}
                checked={settings.enabled}
                disabled={!canManage}
                onChange={(next) => setSettings({ ...settings, enabled: next })}
              />
            </div>
            <TextField
              label={t('booking.intro')}
              value={settings.intro}
              disabled={!canManage}
              onChange={(event) => setSettings({ ...settings, intro: event.target.value })}
            />
            <TextField
              label={t('booking.successMessage')}
              value={settings.successMessage}
              disabled={!canManage}
              onChange={(event) => setSettings({ ...settings, successMessage: event.target.value })}
            />
            <div className="booking-numbers">
              <TextField
                label={t('booking.slotMinutes')}
                type="number"
                min={15}
                max={240}
                value={String(settings.slotMinutes)}
                disabled={!canManage}
                onChange={(event) =>
                  setSettings({ ...settings, slotMinutes: Number(event.target.value) || 60 })
                }
              />
              <TextField
                label={t('booking.maxPerSlot')}
                type="number"
                min={1}
                max={50}
                value={String(settings.maxPerSlot)}
                disabled={!canManage}
                onChange={(event) =>
                  setSettings({ ...settings, maxPerSlot: Number(event.target.value) || 1 })
                }
              />
              <TextField
                label={t('booking.leadHours')}
                type="number"
                min={0}
                max={720}
                value={String(settings.leadHours)}
                disabled={!canManage}
                onChange={(event) =>
                  setSettings({ ...settings, leadHours: Number(event.target.value) || 0 })
                }
              />
              <TextField
                label={t('booking.advanceDays')}
                type="number"
                min={1}
                max={365}
                value={String(settings.advanceDays)}
                disabled={!canManage}
                onChange={(event) =>
                  setSettings({ ...settings, advanceDays: Number(event.target.value) || 30 })
                }
              />
            </div>

            <h3 className="settings-card__title">{t('booking.days')}</h3>
            <ul className="booking-days">
              {settings.days.map((day) => (
                <li key={day.weekday} className="booking-day">
                  <label className="booking-day__toggle">
                    <input
                      type="checkbox"
                      checked={day.open}
                      disabled={!canManage}
                      onChange={(event) => updateDay(day.weekday, { open: event.target.checked })}
                    />
                    <span>{THAI_DAYS[day.weekday]}</span>
                  </label>
                  <input
                    className="booking-day__time"
                    type="time"
                    aria-label={`${t('booking.start')} ${THAI_DAYS[day.weekday]}`}
                    value={day.start}
                    disabled={!canManage || !day.open}
                    onChange={(event) => updateDay(day.weekday, { start: event.target.value })}
                  />
                  <span aria-hidden="true">–</span>
                  <input
                    className="booking-day__time"
                    type="time"
                    aria-label={`${t('booking.end')} ${THAI_DAYS[day.weekday]}`}
                    value={day.end}
                    disabled={!canManage || !day.open}
                    onChange={(event) => updateDay(day.weekday, { end: event.target.value })}
                  />
                </li>
              ))}
            </ul>

            {error ? (
              <p className="settings-error" role="alert">
                {error}
              </p>
            ) : null}
            {canManage ? (
              <div className="settings-actions">
                <Button
                  variant="primary"
                  disabled={savingSettings}
                  onClick={() => void saveSettings()}
                >
                  {savingSettings ? t('settings.saving') : t('common.save')}
                </Button>
              </div>
            ) : null}
          </Card>

          <Card className="settings-card">
            <div className="settings-actions">
              <h2 className="settings-card__title">{t('booking.servicesTitle')}</h2>
              {canManage ? (
                <Button
                  variant="secondary"
                  onClick={() => setEditing({ service: null, input: emptyService() })}
                >
                  {t('booking.addService')}
                </Button>
              ) : null}
            </div>

            {services.length === 0 ? (
              <EmptyState
                illustration={<Icon name="calendar" size={32} />}
                title={t('booking.noServices')}
                description={t('booking.noServicesHint')}
              />
            ) : (
              <ul className="settings-list">
                {services.map((service) => (
                  <li key={service.id} className="settings-row">
                    <div className="settings-row__main">
                      <span className="settings-row__title">
                        {service.name}
                        {service.active ? '' : ` · ${t('booking.active')}: —`}
                      </span>
                      <span className="settings-row__meta">
                        {service.durationMinutes} {t('booking.duration')} ·{' '}
                        {service.price > 0
                          ? formatMembershipPrice(service.price, service.currency)
                          : 'ฟรี'}
                        {service.description ? ` · ${service.description}` : ''}
                      </span>
                    </div>
                    {canManage ? (
                      <div className="settings-row__actions">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setEditing({
                              service,
                              input: {
                                name: service.name,
                                description: service.description,
                                durationMinutes: service.durationMinutes,
                                price: service.price,
                                active: service.active,
                                sort: service.sort,
                              },
                            })
                          }
                        >
                          {t('content.edit')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() => setPendingDelete(service)}
                        >
                          {t('booking.deleteTitle').replace('?', '')}
                        </Button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="settings-card">
            <h2 className="settings-card__title">{t('booking.listTitle')}</h2>
            <div className="booking-filters">
              <TextField
                label={t('booking.when')}
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
              <Select
                label={t('booking.status')}
                value={status}
                onChange={(event) => setStatus(event.target.value as BookingStatus | '')}
              >
                <option value="">{t('booking.allDays')}</option>
                {BOOKING_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {BOOKING_STATUS_LABELS[value].th}
                  </option>
                ))}
              </Select>
            </div>

            {bookings.length === 0 ? (
              <EmptyState
                illustration={<Icon name="calendar" size={32} />}
                title={t('booking.empty')}
                description={t('booking.emptyHint')}
              />
            ) : (
              <ul className="settings-list">
                {bookings.map((booking) => (
                  <li key={booking.id} className="settings-row">
                    <div className="settings-row__main">
                      <span className="settings-row__title">
                        {booking.customerName} · {booking.serviceName}
                      </span>
                      <span className="settings-row__meta">
                        {bookingRangeLabel(booking.startsAt, booking.endsAt)} ·{' '}
                        {BOOKING_STATUS_LABELS[booking.status].th}
                        {booking.customerPhone ? ` · ${booking.customerPhone}` : ''}
                        {booking.customerEmail ? ` · ${booking.customerEmail}` : ''}
                        {booking.note ? ` · ${booking.note}` : ''}
                      </span>
                    </div>
                    {canManage ? (
                      <div className="settings-row__actions">
                        {booking.status === 'pending' ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={busy}
                            onClick={() => void setStatusOf(booking, 'confirmed')}
                          >
                            {BOOKING_STATUS_LABELS.confirmed.th}
                          </Button>
                        ) : null}
                        {booking.status === 'confirmed' ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={busy}
                            onClick={() => void setStatusOf(booking, 'completed')}
                          >
                            {BOOKING_STATUS_LABELS.completed.th}
                          </Button>
                        ) : null}
                        {booking.status === 'pending' || booking.status === 'confirmed' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busy}
                            onClick={() => void setStatusOf(booking, 'cancelled')}
                          >
                            {BOOKING_STATUS_LABELS.cancelled.th}
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}

      <Modal
        open={editing !== null}
        size="sm"
        title={editing?.service ? t('content.edit') : t('booking.addService')}
        onClose={() => setEditing(null)}
        footer={
          <div className="settings-actions">
            <Button variant="ghost" onClick={() => setEditing(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" disabled={busy} onClick={() => void saveService()}>
              {t('common.save')}
            </Button>
          </div>
        }
      >
        {editing ? (
          <>
            <TextField
              label={t('booking.serviceName')}
              value={editing.input.name}
              onChange={(event) =>
                setEditing({ ...editing, input: { ...editing.input, name: event.target.value } })
              }
            />
            <TextField
              label={t('booking.serviceDescription')}
              value={editing.input.description}
              onChange={(event) =>
                setEditing({
                  ...editing,
                  input: { ...editing.input, description: event.target.value },
                })
              }
            />
            <div className="booking-numbers">
              <TextField
                label={t('booking.duration')}
                type="number"
                min={15}
                max={480}
                value={String(editing.input.durationMinutes)}
                onChange={(event) =>
                  setEditing({
                    ...editing,
                    input: { ...editing.input, durationMinutes: Number(event.target.value) || 60 },
                  })
                }
              />
              <TextField
                label={t('booking.price')}
                type="number"
                min={0}
                value={baht(editing.input.price)}
                onChange={(event) =>
                  setEditing({
                    ...editing,
                    input: {
                      ...editing.input,
                      price: Math.round((Number(event.target.value) || 0) * 100),
                    },
                  })
                }
              />
            </div>
            <div className="settings-switch">
              <Switch
                label={t('booking.active')}
                checked={editing.input.active}
                onChange={(next) =>
                  setEditing({ ...editing, input: { ...editing.input, active: next } })
                }
              />
            </div>
          </>
        ) : null}
      </Modal>

      <Modal
        open={pendingDelete !== null}
        size="sm"
        title={t('booking.deleteTitle')}
        description={
          pendingDelete ? t('booking.deleteBody', { name: pendingDelete.name }) : undefined
        }
        onClose={() => setPendingDelete(null)}
        footer={
          <div className="settings-actions">
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const target = pendingDelete;
                setPendingDelete(null);
                if (target) void deleteService(target);
              }}
            >
              {t('booking.deleteTitle').replace('?', '')}
            </Button>
          </div>
        }
      />
    </div>
  );
};
