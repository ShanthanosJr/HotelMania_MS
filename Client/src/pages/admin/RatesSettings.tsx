import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BsChevronLeft, BsChevronRight } from 'react-icons/bs';
import AdminLayout from '../../components/AdminLayout';
import PageHeader from '../../components/admin/PageHeader';
import { Button, Card, Input, Select, Skeleton, toast } from '../../components/ui';
import { api } from '../../utils/api';
import { addDays, formatDate, formatMoney, todayInput } from '../../utils/booking';
import { hotelNameOf, useRoomTypes } from '../../hooks/usePublicData';

interface Settings { serviceChargePercent: number; taxPercent: number; holdMinutes: number; currency: string }
interface RateDay { date: string; price: number; custom: boolean; closed: boolean; minStay: number | null }

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKS = 6;

/** Monday on or before the date. */
const weekStart = (iso: string) => {
    const d = new Date(`${iso}T00:00:00Z`).getUTCDay();
    return addDays(iso, -((d + 6) % 7));
};

const SettingsCard: React.FC = () => {
    const [s, setS] = useState<Settings | null>(null);
    const [form, setForm] = useState({ serviceChargePercent: '', taxPercent: '', holdMinutes: '' });
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        api.get('/api/admin/settings').then(r => r.json()).then(b => {
            setS(b.data);
            setForm({ serviceChargePercent: String(b.data.serviceChargePercent), taxPercent: String(b.data.taxPercent), holdMinutes: String(b.data.holdMinutes) });
        }).catch(() => toast.error('Could not load settings'));
    }, []);
    const save = async () => {
        setSaving(true);
        try {
            const res = await api.put('/api/admin/settings', {
                serviceChargePercent: Number(form.serviceChargePercent || 0),
                taxPercent: Number(form.taxPercent || 0),
                holdMinutes: Number(form.holdMinutes || 30),
            });
            const body = await res.json();
            if (!res.ok) throw new Error(body.message || 'Could not save');
            setS(body.data);
            toast.success('Settings saved. New bookings use them straight away.');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not save');
        } finally {
            setSaving(false);
        }
    };
    const sc = Number(form.serviceChargePercent) || 0;
    const tx = Number(form.taxPercent) || 0;
    const example = 100 + sc + (100 + sc) * tx / 100;
    return (
        <Card>
            <h2 className="font-display text-xl text-ink dark:text-cream">Charges & booking hold</h2>
            <p className="mt-1 text-sm text-taupe dark:text-gray-400">Used for every new quote and booking. Existing bookings keep the price they were booked at.</p>
            {!s ? <Skeleton className="mt-5 h-24" /> : (
                <>
                    <div className="mt-5 grid gap-4 sm:grid-cols-3">
                        <Input label="Service charge %" type="number" min={0} max={50} step="0.5" value={form.serviceChargePercent} onChange={e => setForm(f => ({ ...f, serviceChargePercent: e.target.value }))} />
                        <Input label="Tax %" type="number" min={0} max={50} step="0.5" value={form.taxPercent} onChange={e => setForm(f => ({ ...f, taxPercent: e.target.value }))} hint="Charged on room + service charge" />
                        <Input label="Online hold (minutes)" type="number" min={5} max={240} value={form.holdMinutes} onChange={e => setForm(f => ({ ...f, holdMinutes: e.target.value }))} hint="How long an unpaid online booking keeps the room" />
                    </div>
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                        <p className="text-sm text-taupe dark:text-gray-400">Example: a {formatMoney(100, s.currency)} night costs the guest <strong className="text-ink dark:text-cream">{formatMoney(Math.round(example * 100) / 100, s.currency)}</strong>.</p>
                        <Button onClick={save} loading={saving}>Save settings</Button>
                    </div>
                </>
            )}
        </Card>
    );
};

const RatesSettings: React.FC = () => {
    const types = useRoomTypes();
    const [typeId, setTypeId] = useState('');
    const [start, setStart] = useState(() => weekStart(todayInput()));
    const [days, setDays] = useState<RateDay[]>([]);
    const [base, setBase] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [currency, setCurrency] = useState('LKR');
    const [sel, setSel] = useState<{ from: string; to: string } | null>(null);
    const [anchor, setAnchor] = useState<string | null>(null);
    const [form, setForm] = useState({ price: '', resetPrice: false, closed: 'keep', minStay: '', resetMinStay: false, weekdays: [] as number[], applyTo: [] as string[] });
    const [saving, setSaving] = useState(false);

    useEffect(() => { if (!typeId && types.data.length) setTypeId(types.data[0]._id); }, [types.data, typeId]);
    useEffect(() => { api.get('/api/availability/config').then(r => r.json()).then(b => setCurrency(b.data.currency)).catch(() => undefined); }, []);
    useEffect(() => { setForm(f => ({ ...f, applyTo: typeId ? [typeId] : [] })); }, [typeId]);

    const load = useCallback(async () => {
        if (!typeId) return;
        setLoading(true);
        try {
            const res = await api.get(`/api/admin/rates?roomType=${typeId}&from=${start}&days=${WEEKS * 7}`);
            const body = await res.json();
            if (!res.ok) throw new Error(body.message || 'Could not load rates');
            setDays(body.data.days);
            setBase(body.data.roomType.basePrice);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not load rates');
        } finally {
            setLoading(false);
        }
    }, [typeId, start]);
    useEffect(() => { load(); }, [load]);

    const today = todayInput();
    const pick = (date: string) => {
        if (date < today) return;
        if (!anchor) { setAnchor(date); setSel({ from: date, to: date }); return; }
        const [from, to] = anchor <= date ? [anchor, date] : [date, anchor];
        setSel({ from, to });
        setAnchor(null);
    };
    const inSel = (d: string) => !!sel && d >= sel.from && d <= sel.to;
    // Nights the change will touch (date range, narrowed by the weekday filter)
    const affected = useMemo(() => {
        if (!sel) return 0;
        let n = 0;
        for (let d = sel.from; d <= sel.to; d = addDays(d, 1)) {
            if (!form.weekdays.length || form.weekdays.includes(new Date(`${d}T00:00:00Z`).getUTCDay())) n += 1;
        }
        return n;
    }, [sel, form.weekdays]);

    const apply = async () => {
        if (!sel) return;
        if (!affected) { toast.warning('None of the selected dates fall on the chosen weekdays.'); return; }
        const payload: Record<string, unknown> = { roomTypes: form.applyTo, from: sel.from, to: sel.to };
        if (form.weekdays.length) payload.weekdays = form.weekdays;
        if (form.resetPrice) payload.price = null; else if (form.price !== '') payload.price = Number(form.price);
        if (form.closed !== 'keep') payload.closed = form.closed === 'close';
        if (form.resetMinStay) payload.minStay = null; else if (form.minStay !== '') payload.minStay = Number(form.minStay);
        const hasChange = form.resetPrice || form.price !== '' || form.closed !== 'keep' || form.resetMinStay || form.minStay !== '';
        if (!hasChange) { toast.warning('Choose a price, open/close or minimum stay to change.'); return; }
        if (!form.applyTo.length) { toast.warning('Choose at least one room type.'); return; }
        setSaving(true);
        try {
            const res = await api.put('/api/admin/rates', payload);
            const body = await res.json();
            if (!res.ok) throw new Error(body.message || 'Could not update rates');
            toast.success(`Updated ${body.data.nights} night${body.data.nights === 1 ? '' : 's'} for ${body.data.roomTypes} room type${body.data.roomTypes === 1 ? '' : 's'}`);
            setForm(f => ({ ...f, price: '', resetPrice: false, closed: 'keep', minStay: '', resetMinStay: false, weekdays: [] }));
            setSel(null);
            load();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not update rates');
        } finally {
            setSaving(false);
        }
    };

    const current = types.data.find(t => t._id === typeId);
    const monthLabel = useMemo(() => {
        const a = formatDate(start, { month: 'short', year: 'numeric' });
        const b = formatDate(addDays(start, WEEKS * 7 - 1), { month: 'short', year: 'numeric' });
        return a === b ? a : `${a} – ${b}`;
    }, [start]);

    return (
        <AdminLayout>
            <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-10">
                <PageHeader title="Rates & settings" subtitle="Set charges, then fine-tune prices, closed dates and minimum stays per night." />
                <SettingsCard />

                <Card>
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <h2 className="font-display text-xl text-ink dark:text-cream">Rate calendar</h2>
                            <p className="mt-1 text-sm text-taupe dark:text-gray-400">Click a start date and an end date, then choose what to change. Base price{current ? ` for ${current.name}` : ''}: {base !== null ? formatMoney(base, currency) : '—'}.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <select aria-label="Room type" value={typeId} onChange={e => { setTypeId(e.target.value); setSel(null); }}
                                className="rounded-lg border border-stone bg-white px-3 py-2 text-sm dark:border-graphite dark:bg-night dark:text-cream cursor-pointer">
                                {types.data.map(t => <option key={t._id} value={t._id}>{t.name}{hotelNameOf(t) ? ` · ${hotelNameOf(t)}` : ''}</option>)}
                            </select>
                            <div className="flex items-center overflow-hidden rounded-lg border border-stone dark:border-graphite">
                                <button type="button" aria-label="Earlier weeks" disabled={start <= weekStart(today)} onClick={() => setStart(addDays(start, -WEEKS * 7))} className="px-3 py-2 hover:bg-linen disabled:opacity-30 dark:hover:bg-graphite cursor-pointer"><BsChevronLeft /></button>
                                <span className="border-x border-stone px-3 py-2 text-xs font-semibold dark:border-graphite">{monthLabel}</span>
                                <button type="button" aria-label="Later weeks" onClick={() => setStart(addDays(start, WEEKS * 7))} className="px-3 py-2 hover:bg-linen dark:hover:bg-graphite cursor-pointer"><BsChevronRight /></button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
                        <div>
                            <div className="grid grid-cols-7 gap-1.5 text-center text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-taupe dark:text-gray-400">
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <div key={d} className="py-1">{d}</div>)}
                            </div>
                            {loading && !days.length ? <Skeleton className="h-80" /> : (
                                <div className={`grid grid-cols-7 gap-1.5 ${loading ? 'opacity-60' : ''}`}>
                                    {days.map(d => {
                                        const past = d.date < today;
                                        const dt = new Date(`${d.date}T00:00:00Z`);
                                        return (
                                            <button key={d.date} type="button" disabled={past} onClick={() => pick(d.date)}
                                                aria-pressed={inSel(d.date)}
                                                aria-label={`${formatDate(d.date)}: ${formatMoney(d.price, currency)}${d.closed ? ', closed' : ''}${d.minStay ? `, minimum ${d.minStay} nights` : ''}`}
                                                className={`flex min-h-[74px] flex-col rounded-lg border p-1.5 text-left transition-colors sm:p-2 ${past ? 'cursor-not-allowed border-transparent opacity-35' : 'cursor-pointer'} ${inSel(d.date)
                                                    ? 'border-bronze bg-parchment ring-2 ring-bronze dark:border-gold dark:bg-gold/15 dark:ring-gold'
                                                    : d.closed ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20' : 'border-stone hover:border-bronze dark:border-graphite dark:hover:border-gold'}`}>
                                                <span className="flex items-center justify-between text-[0.65rem] text-taupe dark:text-gray-400">
                                                    <span className={d.date === today ? 'font-bold text-bronze dark:text-gold' : ''}>{dt.getUTCDate()}{dt.getUTCDate() === 1 ? ` ${dt.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' })}` : ''}</span>
                                                    {d.minStay ? <span title={`Minimum ${d.minStay} nights`}>≥{d.minStay}</span> : null}
                                                </span>
                                                <span className={`mt-auto text-[0.72rem] font-semibold tabular-nums sm:text-sm ${d.custom ? 'text-bronze dark:text-gold' : 'text-ink dark:text-cream'}`}>
                                                    {d.closed ? <span className="text-red-700 dark:text-red-300">Closed</span> : formatMoney(d.price, currency)}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            <p className="mt-3 text-xs text-taupe dark:text-gray-400">
                                <span className="font-semibold text-bronze dark:text-gold">Gold prices</span> differ from the base price. ≥N is the minimum stay for arrivals that day.
                            </p>
                        </div>

                        <div className="space-y-4 rounded-xl bg-linen p-4 dark:bg-night">
                            <p className="text-sm font-semibold text-ink dark:text-cream">
                                {sel ? (sel.from === sel.to ? formatDate(sel.from) : `${formatDate(sel.from, { day: 'numeric', month: 'short' })} – ${formatDate(sel.to, { day: 'numeric', month: 'short', year: 'numeric' })}`) : 'Select dates on the calendar'}
                                {anchor && <span className="block text-xs font-normal text-taupe">Now click the last date</span>}
                                {sel && !anchor && (
                                    <span className={`block text-xs font-normal ${affected ? 'text-taupe' : 'text-danger'}`}>
                                        Applies to {affected} night{affected === 1 ? '' : 's'}{form.weekdays.length ? ' (weekday filter on)' : ''}
                                    </span>
                                )}
                            </p>
                            <fieldset>
                                <legend className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-umber dark:text-gray-300">Only on</legend>
                                <div className="flex flex-wrap gap-1">
                                    {WEEKDAYS.map((w, i) => (
                                        <button key={w} type="button" aria-pressed={form.weekdays.includes(i)}
                                            onClick={() => setForm(f => ({ ...f, weekdays: f.weekdays.includes(i) ? f.weekdays.filter(x => x !== i) : [...f.weekdays, i] }))}
                                            className={`rounded-md px-2 py-1 text-xs font-semibold cursor-pointer ${form.weekdays.includes(i) ? 'bg-bronze text-white dark:bg-gold dark:text-night' : 'bg-white text-umber ring-1 ring-stone dark:bg-charcoal dark:text-cream dark:ring-graphite'}`}>
                                            {w}
                                        </button>
                                    ))}
                                </div>
                                <p className="mt-1 text-xs text-taupe">None selected = every day</p>
                            </fieldset>
                            <div>
                                <Input label={`Price per night (${currency})`} type="number" min={0} step="0.01" value={form.price} disabled={form.resetPrice}
                                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))} hint="Leave empty to keep" />
                                <label className="mt-1.5 flex items-center gap-2 text-xs text-umber dark:text-gray-300">
                                    <input type="checkbox" checked={form.resetPrice} onChange={e => setForm(f => ({ ...f, resetPrice: e.target.checked }))} /> Back to base price
                                </label>
                            </div>
                            <Select label="Availability" value={form.closed} onChange={e => setForm(f => ({ ...f, closed: e.target.value }))}>
                                <option value="keep">Keep as is</option>
                                <option value="close">Close to new bookings</option>
                                <option value="open">Open for booking</option>
                            </Select>
                            <div>
                                <Input label="Minimum stay (nights)" type="number" min={1} max={30} value={form.minStay} disabled={form.resetMinStay}
                                    onChange={e => setForm(f => ({ ...f, minStay: e.target.value }))} hint="For guests arriving on these dates" />
                                <label className="mt-1.5 flex items-center gap-2 text-xs text-umber dark:text-gray-300">
                                    <input type="checkbox" checked={form.resetMinStay} onChange={e => setForm(f => ({ ...f, resetMinStay: e.target.checked }))} /> Remove minimum stay
                                </label>
                            </div>
                            {types.data.length > 1 && (
                                <fieldset>
                                    <legend className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-umber dark:text-gray-300">Apply to</legend>
                                    <div className="max-h-36 space-y-1 overflow-y-auto">
                                        {types.data.map(t => (
                                            <label key={t._id} className="flex items-center gap-2 text-sm text-ink dark:text-cream">
                                                <input type="checkbox" checked={form.applyTo.includes(t._id)}
                                                    onChange={e => setForm(f => ({ ...f, applyTo: e.target.checked ? [...f.applyTo, t._id] : f.applyTo.filter(x => x !== t._id) }))} />
                                                {t.name}{hotelNameOf(t) ? <span className="text-xs text-taupe"> · {hotelNameOf(t)}</span> : null}
                                            </label>
                                        ))}
                                    </div>
                                </fieldset>
                            )}
                            <div className="flex gap-2">
                                <Button fullWidth onClick={apply} loading={saving} disabled={!sel || !affected}>Apply</Button>
                                {sel && <Button variant="ghost" onClick={() => { setSel(null); setAnchor(null); }}>Clear</Button>}
                            </div>
                            <p className="text-xs text-taupe dark:text-gray-400">Closed dates and minimum stays apply to online bookings. The front desk can still book them.</p>
                        </div>
                    </div>
                </Card>
            </div>
        </AdminLayout>
    );
};

export default RatesSettings;
