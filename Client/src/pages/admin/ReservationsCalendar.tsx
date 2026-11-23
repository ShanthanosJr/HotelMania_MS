import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BsChevronLeft, BsChevronRight, BsArrowRepeat } from 'react-icons/bs';
import AdminLayout from '../../components/AdminLayout';
import PageHeader from '../../components/admin/PageHeader';
import { Badge, Button, Modal, Skeleton, confirmDialog, statusTone, toast } from '../../components/ui';
import { api } from '../../utils/api';
import { addDays, formatDate, formatMoney, nightsBetween, statusLabel, todayInput } from '../../utils/booking';
import { useHotels, usePricing } from '../../hooks/usePublicData';

interface CalRoom { _id: string; roomNumber: string; status: string; type?: { _id: string; name: string }; hotel?: { _id: string; name: string } }
interface CalBooking {
    _id: string; code?: string; room: string; checkInDate: string; checkOutDate: string;
    status: string; paymentStatus: string; guests?: number; totalPrice: number; guest: string;
}

const CELL = 52; // px per night
const DAY_MS = 86400000;
const dayIndex = (from: string, iso: string) => Math.round((Date.parse(iso.slice(0, 10)) - Date.parse(from)) / DAY_MS);

const BAR: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-900 ring-1 ring-amber-300 dark:bg-amber-900/50 dark:text-amber-100 dark:ring-amber-700',
    confirmed: 'bg-bronze text-white dark:bg-gold dark:text-night',
    checked_in: 'bg-emerald-600 text-white',
    checked_out: 'bg-stone text-taupe dark:bg-graphite dark:text-gray-400',
};

const ReservationsCalendar: React.FC = () => {
    const hotels = useHotels();
    const { currency } = usePricing();
    const [hotel, setHotel] = useState('');
    const [from, setFrom] = useState(() => addDays(todayInput(), -2));
    const [days, setDays] = useState(14);
    const [rooms, setRooms] = useState<CalRoom[]>([]);
    const [bookings, setBookings] = useState<CalBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<CalBooking | null>(null);
    const [dragging, setDragging] = useState<CalBooking | null>(null);
    const [hover, setHover] = useState<{ room: string; day: number } | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const qs = new URLSearchParams({ from, days: String(days) });
            if (hotel) qs.set('hotel', hotel);
            const res = await api.get(`/api/frontdesk/calendar?${qs}`);
            const body = await res.json();
            if (!res.ok) throw new Error(body.message || 'Could not load the calendar');
            setRooms(body.data.rooms);
            setBookings(body.data.bookings);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not load the calendar');
        } finally {
            setLoading(false);
        }
    }, [from, days, hotel]);
    useEffect(() => { load(); }, [load]);

    const dates = useMemo(() => Array.from({ length: days }, (_, i) => addDays(from, i)), [from, days]);
    const today = todayInput();
    const byRoom = useMemo(() => bookings.reduce((m, b) => m.set(b.room, [...(m.get(b.room) || []), b]), new Map<string, CalBooking[]>()), [bookings]);
    const groups = useMemo(() => {
        const g: { label: string; rooms: CalRoom[] }[] = [];
        for (const r of rooms) {
            const label = `${hotels.data.length > 1 && r.hotel ? `${r.hotel.name} · ` : ''}${r.type?.name || 'Rooms'}`;
            const last = g[g.length - 1];
            if (last && last.label === label) last.rooms.push(r); else g.push({ label, rooms: [r] });
        }
        return g;
    }, [rooms, hotels.data.length]);

    // Occupancy per night across the visible rooms
    const soldPerDay = useMemo(() => dates.map(d => bookings.filter(b => b.status !== 'checked_out' && b.checkInDate.slice(0, 10) <= d && b.checkOutDate.slice(0, 10) > d).length), [dates, bookings]);

    const move = async (b: CalBooking, room: CalRoom, dayIdx: number) => {
        const nights = nightsBetween(b.checkInDate, b.checkOutDate);
        const inHouse = b.status === 'checked_in';
        // Guests already in house can change room, not dates
        const checkIn = inHouse ? b.checkInDate.slice(0, 10) : dates[dayIdx];
        const checkOut = inHouse ? b.checkOutDate.slice(0, 10) : addDays(checkIn, nights);
        const sameRoom = room._id === b.room;
        if (sameRoom && checkIn === b.checkInDate.slice(0, 10)) return;
        const fromRoom = rooms.find(r => r._id === b.room)?.roomNumber;
        // A paid guest keeps the price they paid (a move is the hotel's choice); unpaid bookings are re-priced
        const keepPrice = b.paymentStatus === 'paid';
        const ok = await confirmDialog({
            title: `Move ${b.guest}?`,
            message: `${sameRoom ? `Room ${room.roomNumber}` : `Room ${fromRoom} → ${room.roomNumber}`}, ${formatDate(checkIn, { day: 'numeric', month: 'short' })} – ${formatDate(checkOut, { day: 'numeric', month: 'short' })}. ${keepPrice ? 'The guest keeps the price they paid.' : 'The price is recalculated for the new room and dates.'}${inHouse && checkIn !== dates[dayIdx] ? ' (Checked-in guests keep their dates.)' : ''}`,
            confirmLabel: 'Move booking',
        });
        if (!ok) return;
        const res = await api.put(`/api/bookings/${b._id}`, {
            room: room._id, checkInDate: checkIn, checkOutDate: checkOut,
            ...(keepPrice ? { totalPrice: b.totalPrice } : {}),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) { toast.error(body.message || 'Could not move the booking'); return; }
        toast.success(`Moved to room ${room.roomNumber}`);
        load();
    };

    const labelW = 150;

    return (
        <AdminLayout>
            <div className="p-6 md:p-10">
                <PageHeader
                    title="Reservations calendar"
                    subtitle="Drag a booking to another room or date to move it. Click it for details."
                    actions={<>
                        {hotels.data.length > 1 && (
                            <select aria-label="Hotel" value={hotel} onChange={e => setHotel(e.target.value)}
                                className="rounded-lg border border-stone bg-white px-3 py-2 text-sm dark:border-graphite dark:bg-charcoal dark:text-cream cursor-pointer">
                                <option value="">All hotels</option>
                                {hotels.data.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
                            </select>
                        )}
                        <select aria-label="Days shown" value={days} onChange={e => setDays(Number(e.target.value))}
                            className="rounded-lg border border-stone bg-white px-3 py-2 text-sm dark:border-graphite dark:bg-charcoal dark:text-cream cursor-pointer">
                            <option value={7}>1 week</option><option value={14}>2 weeks</option><option value={31}>1 month</option>
                        </select>
                        <div className="flex overflow-hidden rounded-lg border border-stone dark:border-graphite">
                            <button type="button" aria-label="Earlier" onClick={() => setFrom(addDays(from, -Math.ceil(days / 2)))} className="px-3 py-2 hover:bg-linen dark:hover:bg-graphite cursor-pointer"><BsChevronLeft /></button>
                            <button type="button" onClick={() => setFrom(addDays(todayInput(), -2))} className="border-x border-stone px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] hover:bg-linen dark:border-graphite dark:hover:bg-graphite cursor-pointer">Today</button>
                            <button type="button" aria-label="Later" onClick={() => setFrom(addDays(from, Math.ceil(days / 2)))} className="px-3 py-2 hover:bg-linen dark:hover:bg-graphite cursor-pointer"><BsChevronRight /></button>
                        </div>
                        <input type="date" aria-label="Start date" value={from} onChange={e => e.target.value && setFrom(e.target.value)}
                            className="rounded-lg border border-stone bg-white px-3 py-2 text-sm dark:border-graphite dark:bg-charcoal dark:text-cream" />
                        <Button variant="secondary" size="sm" leftIcon={<BsArrowRepeat />} onClick={load} loading={loading}>Refresh</Button>
                    </>}
                />

                <div className="mb-4 flex flex-wrap gap-4 text-xs text-taupe dark:text-gray-400">
                    {(['pending', 'confirmed', 'checked_in', 'checked_out'] as const).map(s => (
                        <span key={s} className="flex items-center gap-2"><span className={`h-3 w-6 rounded ${BAR[s]}`} />{s === 'pending' ? 'Awaiting payment' : statusLabel(s)}</span>
                    ))}
                    <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-red-500" />Unpaid</span>
                </div>

                {loading && !rooms.length ? <Skeleton className="h-96 rounded-2xl" /> : rooms.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-wheat p-10 text-center text-sm text-taupe">No rooms yet. Add rooms under Rooms.</p>
                ) : (
                    <div className="overflow-x-auto rounded-2xl border border-stone bg-white dark:border-graphite dark:bg-charcoal">
                        <div style={{ width: labelW + days * CELL }} className="select-none">
                            {/* Header */}
                            <div className="sticky top-0 z-20 flex border-b border-stone bg-linen dark:border-graphite dark:bg-night">
                                <div style={{ width: labelW }} className="sticky left-0 z-10 shrink-0 border-r border-stone bg-linen px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-taupe dark:border-graphite dark:bg-night">Room</div>
                                {dates.map((d, i) => {
                                    const dt = new Date(`${d}T00:00:00Z`);
                                    const weekend = dt.getUTCDay() === 5 || dt.getUTCDay() === 6;
                                    return (
                                        <div key={d} style={{ width: CELL }} className={`shrink-0 border-r border-stone py-1.5 text-center dark:border-graphite ${d === today ? 'bg-gold/25' : weekend ? 'bg-parchment/60 dark:bg-white/5' : ''}`}>
                                            <p className="text-[0.6rem] uppercase text-taupe dark:text-gray-400">{dt.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' })}</p>
                                            <p className={`text-sm font-semibold ${d === today ? 'text-bronze dark:text-gold' : 'text-ink dark:text-cream'}`}>{dt.getUTCDate()}</p>
                                            <p className="text-[0.6rem] text-taupe dark:text-gray-500" title="Rooms sold">{rooms.length ? Math.round((soldPerDay[i] / rooms.length) * 100) : 0}%</p>
                                        </div>
                                    );
                                })}
                            </div>

                            {groups.map(g => (
                                <div key={g.label}>
                                    <div className="sticky left-0 border-b border-stone bg-parchment/50 px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-bronze dark:border-graphite dark:bg-white/5 dark:text-gold" style={{ width: labelW + days * CELL }}>
                                        {g.label}
                                    </div>
                                    {g.rooms.map(room => (
                                        <div key={room._id} className="relative flex h-11 border-b border-stone dark:border-graphite">
                                            <div style={{ width: labelW }} className="sticky left-0 z-10 flex shrink-0 items-center justify-between gap-2 border-r border-stone bg-white px-3 dark:border-graphite dark:bg-charcoal">
                                                <span className="font-semibold text-ink dark:text-cream">{room.roomNumber}</span>
                                                {room.status !== 'available' && room.status !== 'occupied' && <Badge tone={statusTone(room.status)} className="!px-2 !py-0.5 !text-[0.55rem]">{statusLabel(room.status)}</Badge>}
                                            </div>
                                            {dates.map((d, i) => (
                                                <div key={d} style={{ width: CELL }}
                                                    className={`shrink-0 border-r border-stone/70 dark:border-graphite/70 ${d === today ? 'bg-gold/10' : ''} ${hover && hover.room === room._id && hover.day === i ? '!bg-gold/30' : ''}`}
                                                    onDragOver={e => { if (dragging) { e.preventDefault(); setHover({ room: room._id, day: i }); } }}
                                                    onDragLeave={() => setHover(null)}
                                                    onDrop={e => { e.preventDefault(); setHover(null); const b = dragging; setDragging(null); if (b) move(b, room, i); }}
                                                />
                                            ))}
                                            {(byRoom.get(room._id) || []).map(b => {
                                                const start = dayIndex(from, b.checkInDate);
                                                const end = dayIndex(from, b.checkOutDate);
                                                const left = Math.max(start * CELL + CELL / 2, 0);
                                                const right = Math.min(end * CELL + CELL / 2, days * CELL);
                                                if (right <= 0 || left >= days * CELL) return null;
                                                const draggable = b.status !== 'checked_out';
                                                return (
                                                    <button
                                                        key={b._id}
                                                        type="button"
                                                        draggable={draggable}
                                                        onDragStart={e => { setDragging(b); e.dataTransfer.effectAllowed = 'move'; }}
                                                        onDragEnd={() => { setDragging(null); setHover(null); }}
                                                        onClick={() => setSelected(b)}
                                                        title={`${b.guest} · ${b.code} · ${statusLabel(b.status)}`}
                                                        style={{ left: labelW + left + 2, width: Math.max(right - left - 4, 18) }}
                                                        className={`absolute top-1.5 z-[5] flex h-8 items-center gap-1.5 overflow-hidden rounded-md px-2 text-left text-xs font-semibold shadow-sm ${BAR[b.status] || BAR.confirmed} ${draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${dragging?._id === b._id ? 'opacity-50' : ''}`}
                                                    >
                                                        {b.paymentStatus !== 'paid' && <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" aria-label="Unpaid" />}
                                                        <span className="truncate">{b.guest}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.guest || ''} description={selected?.code}
                footer={<>
                    <Link to="/admin/bookings" className="text-xs font-semibold uppercase tracking-[0.14em] text-bronze hover:underline dark:text-gold">Open in Bookings</Link>
                    <Link to={`/admin/frontdesk?tab=${selected?.status === 'checked_in' ? 'inhouse' : 'arrivals'}`} className="ml-4 text-xs font-semibold uppercase tracking-[0.14em] text-bronze hover:underline dark:text-gold">Front desk</Link>
                </>}>
                {selected && (
                    <dl className="grid grid-cols-2 gap-4 text-sm">
                        <div><dt className="text-xs uppercase tracking-[0.14em] text-taupe">Room</dt><dd className="mt-1 font-semibold">{rooms.find(r => r._id === selected.room)?.roomNumber}</dd></div>
                        <div><dt className="text-xs uppercase tracking-[0.14em] text-taupe">Guests</dt><dd className="mt-1">{selected.guests || 1}</dd></div>
                        <div><dt className="text-xs uppercase tracking-[0.14em] text-taupe">Arrive</dt><dd className="mt-1">{formatDate(selected.checkInDate)}</dd></div>
                        <div><dt className="text-xs uppercase tracking-[0.14em] text-taupe">Depart</dt><dd className="mt-1">{formatDate(selected.checkOutDate)}</dd></div>
                        <div><dt className="text-xs uppercase tracking-[0.14em] text-taupe">Status</dt><dd className="mt-1"><Badge tone={statusTone(selected.status)}>{statusLabel(selected.status)}</Badge></dd></div>
                        <div><dt className="text-xs uppercase tracking-[0.14em] text-taupe">Payment</dt><dd className="mt-1"><Badge tone={statusTone(selected.paymentStatus)}>{statusLabel(selected.paymentStatus)}</Badge> {formatMoney(selected.totalPrice, currency)}</dd></div>
                    </dl>
                )}
            </Modal>
        </AdminLayout>
    );
};

export default ReservationsCalendar;
