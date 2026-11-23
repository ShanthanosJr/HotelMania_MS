import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BsArrowRepeat, BsBoxArrowInRight, BsBoxArrowRight, BsCashCoin, BsPlusLg } from 'react-icons/bs';
import AdminLayout from '../../components/AdminLayout';
import PageHeader from '../../components/admin/PageHeader';
import DataTable, { type Column } from '../../components/admin/DataTable';
import { Badge, Button, Input, Modal, Select, confirmDialog, statusTone, toast } from '../../components/ui';
import { api } from '../../utils/api';
import { formatDate, formatMoney, nightsBetween, statusLabel, type BookingRecord } from '../../utils/booking';
import { useHotels, usePricing } from '../../hooks/usePublicData';

type Tab = 'arrivals' | 'departures' | 'inhouse';
interface Today { date: string; arrivals: BookingRecord[]; departures: BookingRecord[]; inHouse: BookingRecord[] }
interface RoomOption { _id: string; roomNumber: string; status: string; type?: { name?: string }; sameType: boolean; current: boolean }

const guestName = (b: BookingRecord) => b.guestDetails?.name || b.user?.name || 'Guest';
const short = (iso: string) => formatDate(iso, { day: 'numeric', month: 'short' });

/** POST that returns { ok, status, body } so callers can react to 409 warnings. */
const post = async (url: string, payload: unknown) => {
    const res = await api.post(url, payload);
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, body };
};

const FrontDesk: React.FC = () => {
    const [params, setParams] = useSearchParams();
    const tab = (['arrivals', 'departures', 'inhouse'].includes(params.get('tab') || '') ? params.get('tab') : 'arrivals') as Tab;
    const hotels = useHotels();
    const { currency } = usePricing();
    const [hotel, setHotel] = useState('');
    const [data, setData] = useState<Today | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`/api/frontdesk/today${hotel ? `?hotel=${hotel}` : ''}`);
            const body = await res.json();
            if (!res.ok) throw new Error(body.message || 'Could not load today');
            setData(body.data);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not load today');
        } finally {
            setLoading(false);
        }
    }, [hotel]);
    useEffect(() => { load(); }, [load]);

    /* ---- Check in ---- */
    const [checkIn, setCheckIn] = useState<BookingRecord | null>(null);
    const [roomOptions, setRoomOptions] = useState<RoomOption[]>([]);
    const [roomChoice, setRoomChoice] = useState('');
    const openCheckIn = async (b: BookingRecord) => {
        setCheckIn(b);
        setRoomChoice(b.room?._id || '');
        setRoomOptions([]);
        const res = await api.get(`/api/frontdesk/${b._id}/rooms`);
        const body = await res.json().catch(() => ({}));
        if (res.ok) setRoomOptions(body.data);
    };
    const doCheckIn = async (allow: { allowUnpaid?: boolean; allowDirty?: boolean } = {}): Promise<void> => {
        if (!checkIn) return;
        setBusy(checkIn._id);
        try {
            const r = await post(`/api/frontdesk/${checkIn._id}/check-in`, { room: roomChoice || undefined, ...allow });
            // Each warning is confirmed on its own: unpaid bill, then room not yet cleaned
            if (r.status === 409 && (r.body.code === 'UNPAID' || r.body.code === 'DIRTY')) {
                const unpaid = r.body.code === 'UNPAID';
                const ok = await confirmDialog({
                    title: unpaid ? 'Payment is outstanding' : 'Room not cleaned yet',
                    message: unpaid ? `${r.body.message}. Check in anyway and settle the bill later?` : `${r.body.message}. Check the guest in anyway?`,
                    confirmLabel: 'Check in anyway',
                    cancelLabel: 'Go back',
                });
                if (ok) return doCheckIn({ ...allow, [unpaid ? 'allowUnpaid' : 'allowDirty']: true });
                return;
            }
            if (!r.ok) throw new Error(r.body.message || 'Could not check in');
            toast.success(r.body.message || 'Checked in');
            setCheckIn(null);
            load();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not check in');
        } finally {
            setBusy(null);
        }
    };

    /* ---- Payment ---- */
    const [paying, setPaying] = useState<BookingRecord | null>(null);
    const [payment, setPayment] = useState({ amount: '', type: 'cash' });
    const openPayment = (b: BookingRecord) => { setPaying(b); setPayment({ amount: String(b.totalPrice), type: 'cash' }); };
    const doPayment = async () => {
        if (!paying) return;
        setBusy(paying._id);
        try {
            const r = await post('/api/transactions', { booking: paying._id, amount: payment.amount, type: payment.type });
            if (!r.ok) throw new Error(r.body.message || 'Could not record the payment');
            toast.success('Payment recorded');
            setPaying(null);
            load();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not record the payment');
        } finally {
            setBusy(null);
        }
    };

    /* ---- Check out ---- */
    const doCheckOut = async (b: BookingRecord, force = false) => {
        if (!force && !(await confirmDialog({ title: `Check out ${guestName(b)}?`, message: `Room ${b.room?.roomNumber} will be marked for cleaning.`, confirmLabel: 'Check out' }))) return;
        setBusy(b._id);
        try {
            const r = await post(`/api/frontdesk/${b._id}/check-out`, { force });
            if (r.status === 409 && r.body.code === 'UNPAID') {
                const ok = await confirmDialog({
                    title: 'Bill not settled',
                    message: `${r.body.message}. Record the payment first, or check out and leave it unpaid?`,
                    confirmLabel: 'Check out unpaid', cancelLabel: 'Record payment', tone: 'danger',
                });
                if (ok) return doCheckOut(b, true);
                openPayment(b);
                return;
            }
            if (!r.ok) throw new Error(r.body.message || 'Could not check out');
            toast.success(r.body.message || 'Checked out');
            load();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not check out');
        } finally {
            setBusy(null);
        }
    };

    const rows = useMemo(() => (!data ? [] : tab === 'arrivals' ? data.arrivals : tab === 'departures' ? data.departures : data.inHouse), [data, tab]);
    const today = data?.date?.slice(0, 10);

    const columns: Column<BookingRecord>[] = [
        {
            key: 'guest', header: 'Guest', sortable: true, value: guestName,
            render: b => (
                <div>
                    <p className="font-semibold">{guestName(b)}</p>
                    <p className="text-xs text-taupe dark:text-gray-400">{b.confirmationCode} · {b.guests || 1} guest{(b.guests || 1) === 1 ? '' : 's'}{b.guestDetails?.phone ? ` · ${b.guestDetails.phone}` : ''}</p>
                    {b.guestDetails?.specialRequests && <p className="mt-1 max-w-xs truncate text-xs italic text-bronze dark:text-gold" title={b.guestDetails.specialRequests}>“{b.guestDetails.specialRequests}”</p>}
                </div>
            ),
        },
        {
            key: 'room', header: 'Room', sortable: true, value: b => b.room?.roomNumber,
            render: b => (
                <div>
                    <p className="font-semibold">{b.room?.roomNumber || '—'}</p>
                    <p className="text-xs text-taupe dark:text-gray-400">{b.room?.type?.name}</p>
                    {tab === 'arrivals' && b.room?.status && b.room.status !== 'available' && <Badge tone={statusTone(b.room.status)} className="mt-1">{statusLabel(b.room.status)}</Badge>}
                </div>
            ),
        },
        {
            key: 'stay', header: 'Stay', sortable: true, value: b => b.checkInDate, hideBelow: 'md',
            render: b => (
                <div>
                    <p>{short(b.checkInDate)} → {short(b.checkOutDate)}</p>
                    <p className="text-xs text-taupe dark:text-gray-400">
                        {nightsBetween(b.checkInDate, b.checkOutDate)} night{nightsBetween(b.checkInDate, b.checkOutDate) === 1 ? '' : 's'}
                        {tab === 'arrivals' && b.guestDetails?.arrivalTime ? ` · arriving ${b.guestDetails.arrivalTime}` : ''}
                        {tab !== 'arrivals' && today && b.checkOutDate.slice(0, 10) < today ? ' · overdue' : ''}
                    </p>
                </div>
            ),
        },
        {
            key: 'payment', header: 'Payment', sortable: true, value: b => b.paymentStatus,
            render: b => (
                <div>
                    <Badge tone={statusTone(b.paymentStatus)}>{statusLabel(b.paymentStatus)}</Badge>
                    <p className="mt-1 text-xs text-taupe dark:text-gray-400">{formatMoney(b.totalPrice, b.pricing?.currency || currency)}</p>
                </div>
            ),
        },
        {
            key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right',
            render: b => (
                <div className="flex flex-wrap justify-end gap-2">
                    {b.paymentStatus !== 'paid' && (
                        <Button size="sm" variant="secondary" leftIcon={<BsCashCoin />} onClick={() => openPayment(b)} disabled={busy === b._id}>Take payment</Button>
                    )}
                    {tab === 'arrivals' ? (
                        <Button size="sm" leftIcon={<BsBoxArrowInRight />} onClick={() => openCheckIn(b)} loading={busy === b._id}>Check in</Button>
                    ) : (
                        <Button size="sm" leftIcon={<BsBoxArrowRight />} onClick={() => doCheckOut(b)} loading={busy === b._id}>Check out</Button>
                    )}
                </div>
            ),
        },
    ];

    const tabs: { key: Tab; label: string; n: number }[] = [
        { key: 'arrivals', label: 'Arrivals', n: data?.arrivals.length || 0 },
        { key: 'departures', label: 'Departures', n: data?.departures.length || 0 },
        { key: 'inhouse', label: 'In house', n: data?.inHouse.length || 0 },
    ];

    return (
        <AdminLayout>
            <div className="mx-auto max-w-7xl p-6 md:p-10">
                <PageHeader
                    title="Front desk"
                    subtitle={data ? new Date(data.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }) : 'Today'}
                    actions={<>
                        {hotels.data.length > 1 && (
                            <select aria-label="Hotel" value={hotel} onChange={e => setHotel(e.target.value)}
                                className="rounded-lg border border-stone bg-white px-3 py-2 text-sm dark:border-graphite dark:bg-charcoal dark:text-cream cursor-pointer">
                                <option value="">All hotels</option>
                                {hotels.data.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
                            </select>
                        )}
                        <Button variant="secondary" size="sm" leftIcon={<BsArrowRepeat />} onClick={load} loading={loading}>Refresh</Button>
                        <Link to="/admin/bookings" className="inline-flex items-center gap-2 rounded bg-bronze px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-white hover:bg-bronze-deep dark:bg-gold dark:text-night">
                            <BsPlusLg /> Walk-in booking
                        </Link>
                    </>}
                />

                <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Front desk lists">
                    {tabs.map(t => (
                        <button key={t.key} role="tab" type="button" aria-selected={tab === t.key}
                            onClick={() => setParams({ tab: t.key }, { replace: true })}
                            className={`rounded-full px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors cursor-pointer ${tab === t.key
                                ? 'bg-bronze text-white dark:bg-gold dark:text-night'
                                : 'bg-white text-umber ring-1 ring-stone hover:ring-bronze dark:bg-charcoal dark:text-cream dark:ring-graphite'}`}>
                            {t.label} <span className="ml-1 rounded-full bg-black/10 px-2 py-0.5 dark:bg-white/10">{t.n}</span>
                        </button>
                    ))}
                </div>

                <DataTable
                    columns={columns}
                    rows={rows}
                    rowKey={b => b._id}
                    loading={loading}
                    searchText={b => [guestName(b), b.confirmationCode, b.room?.roomNumber, b.guestDetails?.phone, b.guestDetails?.email].join(' ')}
                    searchPlaceholder="Name, code, room, phone"
                    exportName={`front-desk-${tab}`}
                    emptyTitle={tab === 'arrivals' ? 'No more arrivals today' : tab === 'departures' ? 'No departures due' : 'Nobody is checked in'}
                    initialSort={{ key: tab === 'arrivals' ? 'stay' : 'room', dir: 'asc' }}
                />
            </div>

            <Modal open={!!checkIn} onClose={() => setCheckIn(null)} title={checkIn ? `Check in ${guestName(checkIn)}` : ''}
                description={checkIn ? `${checkIn.confirmationCode} · ${short(checkIn.checkInDate)} → ${short(checkIn.checkOutDate)} · ${checkIn.guests || 1} guest(s)` : undefined}
                footer={<><Button variant="ghost" onClick={() => setCheckIn(null)}>Cancel</Button><Button loading={!!busy} onClick={() => doCheckIn()}>Check in</Button></>}>
                {checkIn && (
                    <div className="space-y-4">
                        <Select label="Room" value={roomChoice} onChange={e => setRoomChoice(e.target.value)}
                            hint="Rooms of the booked type are listed first. A room marked Dirty still needs cleaning.">
                            {roomOptions.length === 0 && <option value={checkIn.room?._id}>{checkIn.room?.roomNumber} (assigned)</option>}
                            {roomOptions.map(r => (
                                <option key={r._id} value={r._id}>
                                    {r.roomNumber} · {r.type?.name}{r.current ? ' · assigned' : ''}{r.status !== 'available' ? ` · ${statusLabel(r.status)}` : ''}{!r.sameType ? ' · different type' : ''}
                                </option>
                            ))}
                        </Select>
                        {checkIn.guestDetails?.specialRequests && (
                            <p className="rounded-lg border-l-4 border-gold bg-linen px-4 py-3 text-sm dark:bg-night">“{checkIn.guestDetails.specialRequests}”</p>
                        )}
                        {checkIn.paymentStatus !== 'paid' && (
                            <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-900/20 dark:text-amber-100">
                                {formatMoney(checkIn.totalPrice, checkIn.pricing?.currency || currency)} is unpaid. <button type="button" className="font-semibold underline cursor-pointer" onClick={() => { const b = checkIn; setCheckIn(null); openPayment(b); }}>Take payment now</button>
                            </p>
                        )}
                    </div>
                )}
            </Modal>

            <Modal open={!!paying} onClose={() => setPaying(null)} title="Record a payment"
                description={paying ? `${guestName(paying)} · ${paying.confirmationCode}` : undefined}
                footer={<><Button variant="ghost" onClick={() => setPaying(null)}>Cancel</Button><Button loading={!!busy} onClick={doPayment}>Record payment</Button></>}>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Input label="Amount" type="number" min={0} step="0.01" value={payment.amount} onChange={e => setPayment(p => ({ ...p, amount: e.target.value }))}
                        hint={paying ? `Total ${formatMoney(paying.totalPrice, paying.pricing?.currency || currency)}` : undefined} />
                    <Select label="Method" value={payment.type} onChange={e => setPayment(p => ({ ...p, type: e.target.value }))}>
                        <option value="cash">Cash</option>
                        <option value="credit_card">Credit card (terminal)</option>
                        <option value="debit_card">Debit card (terminal)</option>
                        <option value="bank_transfer">Bank transfer</option>
                    </Select>
                </div>
                <p className="mt-4 text-xs text-taupe dark:text-gray-400">Never type card numbers here. Take card payments on the terminal and record them.</p>
            </Modal>
        </AdminLayout>
    );
};

export default FrontDesk;
