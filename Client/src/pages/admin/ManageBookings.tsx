import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BsArrowRepeat, BsPlusLg, BsPencil, BsXCircle, BsCashStack, BsTrash, BsCalendar3 } from 'react-icons/bs';
import AdminLayout from '../../components/AdminLayout';
import PageHeader from '../../components/admin/PageHeader';
import DataTable, { type Column } from '../../components/admin/DataTable';
import FilterTabs from '../../components/admin/FilterTabs';
import { Badge, Button, Input, Modal, Select, Textarea, confirmDialog, statusTone, toast } from '../../components/ui';
import { apiJson, errorText } from '../../utils/adminApi';
import { getStoredUser } from '../../utils/auth';
import { addDays, formatDate, formatMoney, hotelOf, nightsBetween, statusLabel, todayInput, type BookingRecord } from '../../utils/booking';
import { usePricing } from '../../hooks/usePublicData';

type Filter = 'upcoming' | 'inhouse' | 'unpaid' | 'past' | 'cancelled' | 'refund' | 'all';
interface UserLite { _id: string; name: string; email: string; phone?: string; role: string }
interface RoomLite { _id: string; roomNumber: string; status: string; type?: { _id: string; name: string; maxOccupancy?: number }; hotel?: { _id: string; name: string } }
interface AuditRow { _id: string; action: string; summary?: string; actorName?: string; createdAt: string }

const guestName = (b: BookingRecord) => b.guestDetails?.name || b.user?.name || 'Guest';
const refundDue = (b: BookingRecord) => b.refund?.status === 'due';
const STATUSES = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'] as const;
const PAYMENTS = ['pending', 'paid', 'refunded'] as const;
const short = (iso: string) => formatDate(iso, { day: 'numeric', month: 'short', year: '2-digit' });

const emptyForm = () => ({
    user: '', name: '', email: '', phone: '', room: '', checkInDate: todayInput(), checkOutDate: addDays(todayInput(), 1),
    guests: '2', status: 'confirmed', paymentStatus: 'pending', totalPrice: '', specialRequests: '',
});

const ManageBookings: React.FC = () => {
    const isAdmin = getStoredUser()?.role === 'admin';
    const { currency } = usePricing();
    const [bookings, setBookings] = useState<BookingRecord[]>([]);
    const [users, setUsers] = useState<UserLite[]>([]);
    const [rooms, setRooms] = useState<RoomLite[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<Filter>('upcoming');
    const [open, setOpen] = useState<BookingRecord | null>(null);
    const [history, setHistory] = useState<AuditRow[]>([]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [b, u, r] = await Promise.all([
                apiJson<BookingRecord[]>('GET', '/api/bookings'),
                apiJson<UserLite[]>('GET', '/api/users').catch(() => []),
                apiJson<RoomLite[]>('GET', '/api/rooms'),
            ]);
            setBookings(b);
            setUsers(u);
            setRooms(r);
        } catch (err) {
            toast.error(errorText(err, 'Could not load bookings'));
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { load(); }, [load]);

    const today = todayInput();
    const groups = useMemo(() => {
        const live = (b: BookingRecord) => b.status !== 'pending' || b.paymentStatus === 'paid' || !b.holdExpiresAt || Date.parse(b.holdExpiresAt) > Date.now();
        return {
            upcoming: bookings.filter(b => ['pending', 'confirmed'].includes(b.status) && b.checkOutDate.slice(0, 10) > today && live(b)),
            inhouse: bookings.filter(b => b.status === 'checked_in'),
            unpaid: bookings.filter(b => ['pending', 'confirmed', 'checked_in'].includes(b.status) && b.paymentStatus !== 'paid' && live(b)),
            past: bookings.filter(b => b.status === 'checked_out' || (['pending', 'confirmed'].includes(b.status) && (b.checkOutDate.slice(0, 10) <= today || !live(b)))),
            cancelled: bookings.filter(b => b.status === 'cancelled'),
            refund: bookings.filter(refundDue),
            all: bookings,
        } as Record<Filter, BookingRecord[]>;
    }, [bookings, today]);

    const money = (b: BookingRecord, n?: number) => formatMoney(n ?? b.totalPrice, b.pricing?.currency || currency);

    const loadHistory = (id: string) => {
        // Audit entries are written just after the response; give them a moment
        setTimeout(() => apiJson<AuditRow[]>('GET', `/api/admin/audit?entity=booking&entityId=${id}&limit=30`).then(setHistory).catch(() => undefined), 150);
    };
    const openDetails = (b: BookingRecord) => {
        setOpen(b);
        setHistory([]);
        loadHistory(b._id);
    };
    const replace = (b: BookingRecord) => {
        setBookings(list => list.map(x => (x._id === b._id ? b : x)));
        setOpen(o => (o && o._id === b._id ? b : o));
        loadHistory(b._id);
    };

    /* ---------- New / edit ---------- */
    const [editing, setEditing] = useState<BookingRecord | 'new' | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [freeRooms, setFreeRooms] = useState<RoomLite[] | null>(null);
    const [saving, setSaving] = useState(false);
    const set = (k: keyof ReturnType<typeof emptyForm>) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

    const startNew = () => { setForm(emptyForm()); setEditing('new'); };
    const startEdit = (b: BookingRecord) => {
        setForm({
            ...emptyForm(),
            room: b.room?._id || '', checkInDate: b.checkInDate.slice(0, 10), checkOutDate: b.checkOutDate.slice(0, 10),
            guests: String(b.guests || 1), status: b.status, paymentStatus: b.paymentStatus, totalPrice: String(b.totalPrice),
        });
        setEditing(b);
    };

    // Free rooms for the chosen dates (the booking being edited keeps its own room)
    useEffect(() => {
        if (!editing || !form.checkInDate || !form.checkOutDate || form.checkOutDate <= form.checkInDate) { setFreeRooms(null); return; }
        let alive = true;
        apiJson<RoomLite[]>('GET', `/api/rooms?checkIn=${form.checkInDate}&checkOut=${form.checkOutDate}`)
            .then(list => { if (alive) setFreeRooms(list); })
            .catch(() => { if (alive) setFreeRooms(null); });
        return () => { alive = false; };
    }, [editing, form.checkInDate, form.checkOutDate]);

    const roomChoices = useMemo(() => {
        const base = freeRooms || rooms;
        const current = editing && editing !== 'new' ? rooms.find(r => r._id === editing.room?._id) : undefined;
        const list = current && !base.some(r => r._id === current._id) ? [current, ...base] : base;
        return [...list].sort((a, b) => `${a.hotel?.name}${a.type?.name}`.localeCompare(`${b.hotel?.name}${b.type?.name}`) || a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));
    }, [freeRooms, rooms, editing]);

    const pickUser = (id: string) => {
        const u = users.find(x => x._id === id);
        setForm(f => ({ ...f, user: id, name: u?.name || f.name, email: u?.email || f.email, phone: u?.phone || f.phone }));
    };

    const save = async () => {
        if (!form.room) return toast.warning('Choose a room.');
        if (form.checkOutDate <= form.checkInDate) return toast.warning('Check-out must be after check-in.');
        setSaving(true);
        try {
            if (editing === 'new') {
                if (!form.name.trim() || !form.email.trim()) { toast.warning('Guest name and email are required.'); setSaving(false); return; }
                const created = await apiJson<BookingRecord>('POST', '/api/bookings', {
                    room: form.room, checkInDate: form.checkInDate, checkOutDate: form.checkOutDate, guests: Number(form.guests),
                    status: form.status, paymentStatus: form.paymentStatus, user: form.user || undefined,
                    guestDetails: { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() || undefined, specialRequests: form.specialRequests.trim() || undefined },
                });
                setBookings(list => [created, ...list]);
                toast.success(`Booking ${created.confirmationCode} created`);
            } else if (editing) {
                // Send only what changed, so the history shows exactly what staff did
                const payload: Record<string, unknown> = {};
                if (form.room !== editing.room?._id) payload.room = form.room;
                if (form.checkInDate !== editing.checkInDate.slice(0, 10)) payload.checkInDate = form.checkInDate;
                if (form.checkOutDate !== editing.checkOutDate.slice(0, 10)) payload.checkOutDate = form.checkOutDate;
                if (Number(form.guests) !== (editing.guests || 1)) payload.guests = Number(form.guests);
                if (form.status !== editing.status) payload.status = form.status;
                if (form.paymentStatus !== editing.paymentStatus) payload.paymentStatus = form.paymentStatus;
                // Only send a price when it was changed by hand; otherwise the server re-prices date/room changes
                if (form.totalPrice !== '' && Number(form.totalPrice) !== editing.totalPrice) payload.totalPrice = Number(form.totalPrice);
                if (!Object.keys(payload).length) { setEditing(null); setSaving(false); return; }
                const updated = await apiJson<BookingRecord>('PUT', `/api/bookings/${editing._id}`, payload);
                replace(updated);
                toast.success('Booking updated');
            }
            setEditing(null);
        } catch (err) {
            toast.error(errorText(err, 'Could not save the booking'));
        } finally {
            setSaving(false);
        }
    };

    /* ---------- Cancel / refund / delete ---------- */
    const cancel = async (b: BookingRecord) => {
        if (!(await confirmDialog({ title: `Cancel ${b.confirmationCode}?`, message: `The room is released and ${guestName(b)} gets an email.${b.paymentStatus === 'paid' ? ' A refund will be marked as due.' : ''}`, confirmLabel: 'Cancel booking', cancelLabel: 'Keep', tone: 'danger' }))) return;
        try {
            replace(await apiJson<BookingRecord>('PATCH', `/api/bookings/${b._id}/cancel`));
            toast.success('Booking cancelled');
        } catch (err) { toast.error(errorText(err)); }
    };

    const [refunding, setRefunding] = useState<BookingRecord | null>(null);
    const [refundForm, setRefundForm] = useState({ amount: '', reference: '', note: '' });
    const refund = async () => {
        if (!refunding) return;
        setSaving(true);
        try {
            replace(await apiJson<BookingRecord>('POST', `/api/bookings/${refunding._id}/refund`, refundForm));
            toast.success('Refund recorded and the guest emailed');
            setRefunding(null);
        } catch (err) { toast.error(errorText(err)); } finally { setSaving(false); }
    };

    const remove = async (b: BookingRecord) => {
        if (!(await confirmDialog({ title: `Delete ${b.confirmationCode}?`, message: 'This removes the booking permanently. Prefer Cancel unless it was created by mistake.', confirmLabel: 'Delete', tone: 'danger' }))) return;
        try {
            await apiJson('DELETE', `/api/bookings/${b._id}`);
            setBookings(list => list.filter(x => x._id !== b._id));
            setOpen(null);
            toast.success('Booking deleted');
        } catch (err) { toast.error(errorText(err)); }
    };

    const columns: Column<BookingRecord>[] = [
        {
            key: 'guest', header: 'Guest', sortable: true, value: guestName,
            render: b => (
                <div>
                    <p className="font-semibold">{guestName(b)}</p>
                    <p className="text-xs text-taupe dark:text-gray-400">{b.confirmationCode}{b.guestDetails?.email || b.user?.email ? ` · ${b.guestDetails?.email || b.user?.email}` : ''}</p>
                </div>
            ),
        },
        {
            key: 'room', header: 'Room', sortable: true, value: b => b.room?.roomNumber,
            render: b => (
                <div>
                    <p className="font-semibold">{b.room?.roomNumber || '—'} <span className="font-normal text-taupe">· {b.room?.type?.name}</span></p>
                    <p className="text-xs text-taupe dark:text-gray-400">{hotelOf(b)?.name}</p>
                </div>
            ),
        },
        {
            key: 'checkIn', header: 'Stay', sortable: true, value: b => b.checkInDate,
            render: b => (
                <div>
                    <p>{short(b.checkInDate)} → {short(b.checkOutDate)}</p>
                    <p className="text-xs text-taupe dark:text-gray-400">{nightsBetween(b.checkInDate, b.checkOutDate)} nights · {b.guests || 1} guests</p>
                </div>
            ),
        },
        { key: 'total', header: 'Total', sortable: true, align: 'right', value: b => b.totalPrice, render: b => <span className="font-semibold tabular-nums">{money(b)}</span>, hideBelow: 'md' },
        {
            key: 'status', header: 'Status', sortable: true, value: b => b.status,
            render: b => (
                <div className="flex flex-wrap gap-1">
                    <Badge tone={statusTone(b.status)}>{statusLabel(b.status)}</Badge>
                    <Badge tone={statusTone(b.paymentStatus)}>{statusLabel(b.paymentStatus)}</Badge>
                    {refundDue(b) && <Badge tone="danger">Refund due</Badge>}
                </div>
            ),
        },
        { key: 'created', header: 'Booked', sortable: true, value: b => b.createdAt, render: b => <span className="text-xs text-taupe">{b.createdAt ? short(b.createdAt) : '—'}</span>, hideBelow: 'lg' },
    ];

    const tabs: { key: Filter; label: string; count: number }[] = [
        { key: 'upcoming', label: 'Upcoming', count: groups.upcoming.length },
        { key: 'inhouse', label: 'In house', count: groups.inhouse.length },
        { key: 'unpaid', label: 'Unpaid', count: groups.unpaid.length },
        { key: 'refund', label: 'Refund due', count: groups.refund.length },
        { key: 'past', label: 'Past', count: groups.past.length },
        { key: 'cancelled', label: 'Cancelled', count: groups.cancelled.length },
        { key: 'all', label: 'All', count: bookings.length },
    ];

    const editingRecord = editing && editing !== 'new' ? editing : null;

    return (
        <AdminLayout>
            <div className="mx-auto max-w-7xl p-6 md:p-10">
                <PageHeader
                    title="Bookings"
                    subtitle="Every reservation. Click a row for details, history and actions."
                    actions={<>
                        <Link to="/admin/calendar" className="inline-flex items-center gap-2 rounded border-2 border-bronze px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-bronze hover:bg-bronze hover:text-white dark:border-gold dark:text-gold"><BsCalendar3 /> Calendar</Link>
                        <Button variant="secondary" size="sm" leftIcon={<BsArrowRepeat />} onClick={load} loading={loading}>Refresh</Button>
                        <Button size="sm" leftIcon={<BsPlusLg />} onClick={startNew}>New booking</Button>
                    </>}
                />
                <FilterTabs label="Booking filter" tabs={tabs} value={filter} onChange={setFilter} />
                <DataTable
                    columns={columns}
                    rows={groups[filter]}
                    rowKey={b => b._id}
                    loading={loading}
                    onRowClick={openDetails}
                    searchText={b => [guestName(b), b.confirmationCode, b.guestDetails?.email, b.user?.email, b.guestDetails?.phone, b.room?.roomNumber, b.room?.type?.name, hotelOf(b)?.name].join(' ')}
                    searchPlaceholder="Guest, code, email, phone, room"
                    exportName={`bookings-${filter}`}
                    initialSort={{ key: 'checkIn', dir: filter === 'past' || filter === 'cancelled' || filter === 'all' ? 'desc' : 'asc' }}
                    emptyTitle="No bookings here"
                    rowClassName={b => (refundDue(b) ? 'bg-red-50/60 dark:bg-red-900/10' : '')}
                />
            </div>

            {/* Details */}
            <Modal open={!!open} onClose={() => setOpen(null)} size="lg" title={open ? `${guestName(open)} · ${open.confirmationCode}` : ''}
                description={open ? `${open.room?.type?.name || 'Room'} ${open.room?.roomNumber || ''} · ${hotelOf(open)?.name || ''}` : undefined}
                footer={open && <div className="flex w-full flex-wrap justify-between gap-2">
                    <div className="flex flex-wrap gap-2">
                        {isAdmin && <Button size="sm" variant="ghost" leftIcon={<BsTrash />} onClick={() => remove(open)}>Delete</Button>}
                        {['pending', 'confirmed'].includes(open.status) && <Button size="sm" variant="danger" leftIcon={<BsXCircle />} onClick={() => cancel(open)}>Cancel booking</Button>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {isAdmin && refundDue(open) && <Button size="sm" variant="secondary" leftIcon={<BsCashStack />} onClick={() => { setRefunding(open); setRefundForm({ amount: String(open.refund?.amount ?? open.totalPrice), reference: '', note: '' }); }}>Record refund</Button>}
                        {open.status !== 'cancelled' && <Button size="sm" leftIcon={<BsPencil />} onClick={() => startEdit(open)}>Edit</Button>}
                    </div>
                </div>}>
                {open && (
                    <div className="space-y-6 text-sm">
                        <div className="flex flex-wrap gap-2">
                            <Badge tone={statusTone(open.status)}>{statusLabel(open.status)}</Badge>
                            <Badge tone={statusTone(open.paymentStatus)}>{statusLabel(open.paymentStatus)}</Badge>
                            {refundDue(open) && <Badge tone="danger">Refund due {money(open, open.refund?.amount)}</Badge>}
                            {open.refund?.status === 'completed' && <Badge tone="info">Refunded {money(open, open.refund.amount)}{open.refund.reference ? ` · ${open.refund.reference}` : ''}</Badge>}
                        </div>
                        <dl className="grid gap-4 sm:grid-cols-3">
                            <div><dt className="text-xs uppercase tracking-[0.14em] text-taupe">Arrive</dt><dd className="mt-1 font-semibold">{formatDate(open.checkInDate)}</dd></div>
                            <div><dt className="text-xs uppercase tracking-[0.14em] text-taupe">Depart</dt><dd className="mt-1 font-semibold">{formatDate(open.checkOutDate)}</dd></div>
                            <div><dt className="text-xs uppercase tracking-[0.14em] text-taupe">Guests</dt><dd className="mt-1 font-semibold">{open.guests || 1}</dd></div>
                            <div><dt className="text-xs uppercase tracking-[0.14em] text-taupe">Email</dt><dd className="mt-1 break-all">{open.guestDetails?.email || open.user?.email || '—'}</dd></div>
                            <div><dt className="text-xs uppercase tracking-[0.14em] text-taupe">Phone</dt><dd className="mt-1">{open.guestDetails?.phone || open.user?.phone || '—'}</dd></div>
                            <div><dt className="text-xs uppercase tracking-[0.14em] text-taupe">Arrival time</dt><dd className="mt-1">{open.guestDetails?.arrivalTime || '—'}</dd></div>
                        </dl>
                        {open.guestDetails?.specialRequests && <p className="rounded-lg border-l-4 border-gold bg-linen px-4 py-3 dark:bg-night">“{open.guestDetails.specialRequests}”</p>}
                        <div className="rounded-xl border border-stone p-4 dark:border-graphite">
                            {open.pricing ? (
                                <dl className="space-y-1.5">
                                    <div className="flex justify-between"><dt>{money(open, open.pricing.nightlyRate)} × {open.pricing.nights} nights</dt><dd>{money(open, open.pricing.subtotal)}</dd></div>
                                    {open.pricing.serviceCharge > 0 && <div className="flex justify-between"><dt>Service charge ({open.pricing.serviceChargePercent}%)</dt><dd>{money(open, open.pricing.serviceCharge)}</dd></div>}
                                    {open.pricing.tax > 0 && <div className="flex justify-between"><dt>Tax ({open.pricing.taxPercent}%)</dt><dd>{money(open, open.pricing.tax)}</dd></div>}
                                    <div className="flex justify-between border-t border-stone pt-2 font-semibold dark:border-graphite"><dt>Total</dt><dd>{money(open)}</dd></div>
                                </dl>
                            ) : <p className="flex justify-between font-semibold"><span>Total (set by staff)</span><span>{money(open)}</span></p>}
                        </div>
                        <div>
                            <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-taupe">History</h3>
                            {history.length === 0 ? <p className="text-taupe">No staff actions recorded yet.</p> : (
                                <ol className="space-y-2 border-l-2 border-stone pl-4 dark:border-graphite">
                                    {history.map(h => (
                                        <li key={h._id}>
                                            <p className="text-ink dark:text-cream">{h.summary}</p>
                                            <p className="text-xs text-taupe">{h.actorName} · {new Date(h.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* New / edit */}
            <Modal open={!!editing} onClose={() => setEditing(null)} size="lg"
                title={editing === 'new' ? 'New booking' : editingRecord ? `Edit ${editingRecord.confirmationCode}` : ''}
                description={editing === 'new' ? 'For walk-ins and phone bookings. Pick an existing guest or type their details.' : 'Changing room or dates re-prices the stay unless you set the total yourself.'}
                footer={<><Button variant="ghost" onClick={() => setEditing(null)}>Close</Button><Button onClick={save} loading={saving}>{editing === 'new' ? 'Create booking' : 'Save changes'}</Button></>}>
                <div className="grid gap-4 sm:grid-cols-2">
                    {editing === 'new' && (
                        <>
                            <Select label="Existing guest (optional)" value={form.user} onChange={e => pickUser(e.target.value)} containerClassName="sm:col-span-2">
                                <option value="">New / walk-in guest</option>
                                {users.filter(u => u.role === 'guest').map(u => <option key={u._id} value={u._id}>{u.name} · {u.email}</option>)}
                            </Select>
                            <Input label="Guest name" required value={form.name} onChange={set('name')} />
                            <Input label="Email" type="email" required value={form.email} onChange={set('email')} hint="The confirmation is sent here" />
                            <Input label="Phone" value={form.phone} onChange={set('phone')} />
                        </>
                    )}
                    <Input label="Check-in" type="date" value={form.checkInDate} onChange={e => setForm(f => ({ ...f, checkInDate: e.target.value, checkOutDate: f.checkOutDate > e.target.value ? f.checkOutDate : addDays(e.target.value, 1) }))} />
                    <Input label="Check-out" type="date" min={addDays(form.checkInDate, 1)} value={form.checkOutDate} onChange={set('checkOutDate')} />
                    <Select label="Room" value={form.room} onChange={set('room')} containerClassName="sm:col-span-2"
                        hint={freeRooms ? `${freeRooms.length} room(s) free for these dates` : undefined}>
                        <option value="">Choose a room</option>
                        {roomChoices.map(r => (
                            <option key={r._id} value={r._id}>{r.roomNumber} · {r.type?.name} · {r.hotel?.name}{r.status === 'dirty' ? ' · dirty' : ''}{r.status === 'maintenance' ? ' · out of order' : ''}</option>
                        ))}
                    </Select>
                    <Input label="Guests" type="number" min={1} max={20} value={form.guests} onChange={set('guests')} />
                    <Select label="Status" value={form.status} onChange={set('status')}>
                        {STATUSES.filter(s => editing !== 'new' || s !== 'checked_out').map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
                    </Select>
                    <Select label="Payment" value={form.paymentStatus} onChange={set('paymentStatus')} hint="To take a real payment, use Front desk → Take payment">
                        {PAYMENTS.filter(p => editing !== 'new' || p !== 'refunded').map(p => <option key={p} value={p}>{statusLabel(p)}</option>)}
                    </Select>
                    {editing !== 'new' && <Input label="Total (override)" type="number" min={0} step="0.01" value={form.totalPrice} onChange={set('totalPrice')} hint="Leave as is to keep automatic pricing" />}
                    {editing === 'new' && <Textarea label="Special requests" rows={2} value={form.specialRequests} onChange={set('specialRequests')} containerClassName="sm:col-span-2" />}
                </div>
            </Modal>

            {/* Refund */}
            <Modal open={!!refunding} onClose={() => setRefunding(null)} title="Record a refund"
                description={refunding ? `${guestName(refunding)} · ${refunding.confirmationCode} · paid ${money(refunding)}` : undefined}
                footer={<><Button variant="ghost" onClick={() => setRefunding(null)}>Cancel</Button><Button onClick={refund} loading={saving}>Record refund</Button></>}>
                <div className="grid gap-4">
                    <Input label="Amount refunded" type="number" min={0} step="0.01" value={refundForm.amount} onChange={e => setRefundForm(f => ({ ...f, amount: e.target.value }))} />
                    <Input label="Reference" value={refundForm.reference} onChange={e => setRefundForm(f => ({ ...f, reference: e.target.value }))} hint="PayHere refund ID or bank reference" />
                    <Textarea label="Note" rows={2} value={refundForm.note} onChange={e => setRefundForm(f => ({ ...f, note: e.target.value }))} />
                    <p className="text-xs text-taupe">Send the money back in PayHere or your bank first. This records it and emails the guest.</p>
                </div>
            </Modal>
        </AdminLayout>
    );
};

export default ManageBookings;
