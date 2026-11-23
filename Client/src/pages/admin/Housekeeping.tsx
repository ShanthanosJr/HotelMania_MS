import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BsArrowRepeat, BsCheck2Circle, BsExclamationTriangle, BsPersonFill, BsTools, BsBrush, BsBoxArrowInRight } from 'react-icons/bs';
import AdminLayout from '../../components/AdminLayout';
import PageHeader from '../../components/admin/PageHeader';
import { Badge, Button, EmptyState, Skeleton, statusTone, toast } from '../../components/ui';
import { api } from '../../utils/api';
import { formatDate, statusLabel } from '../../utils/booking';
import { useHotels } from '../../hooks/usePublicData';

interface Req { _id: string; type: string; status: string; notes?: string; createdAt: string }
interface BoardRoom {
    _id: string; roomNumber: string; status: 'available' | 'occupied' | 'dirty' | 'maintenance';
    type?: { name: string }; hotel?: { name: string };
    guest: { name: string; guests?: number; checkOutDate: string; departsToday: boolean } | null;
    arrival: { name: string; arrivalTime?: string } | null;
    requests: Req[];
}

const FILTERS = [
    { key: 'all', label: 'All rooms' },
    { key: 'dirty', label: 'To clean' },
    { key: 'available', label: 'Clean' },
    { key: 'occupied', label: 'Occupied' },
    { key: 'maintenance', label: 'Out of order' },
] as const;

const TILE: Record<BoardRoom['status'], string> = {
    available: 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20',
    dirty: 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20',
    occupied: 'border-sky-300 bg-sky-50 dark:border-sky-800 dark:bg-sky-900/20',
    maintenance: 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20',
};
const REQ_LABEL: Record<string, string> = { cleaning: 'Cleaning', food: 'In-room dining', repair: 'Repair' };
const roomLabel = (s: string) => (s === 'available' ? 'Clean' : s === 'maintenance' ? 'Out of order' : statusLabel(s));

const Housekeeping: React.FC = () => {
    const hotels = useHotels();
    const [hotel, setHotel] = useState('');
    const [rooms, setRooms] = useState<BoardRoom[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('all');
    const [busy, setBusy] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`/api/housekeeping/board${hotel ? `?hotel=${hotel}` : ''}`);
            const body = await res.json();
            if (!res.ok) throw new Error(body.message || 'Could not load the board');
            setRooms(body.data.rooms);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not load the board');
        } finally {
            setLoading(false);
        }
    }, [hotel]);
    useEffect(() => { load(); }, [load]);
    // Keep the board fresh while it's open on a tablet
    useEffect(() => {
        const t = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 60000);
        return () => clearInterval(t);
    }, [load]);

    const setStatus = async (room: BoardRoom, status: 'available' | 'dirty' | 'maintenance') => {
        setBusy(room._id);
        try {
            const res = await api.request(`/api/housekeeping/rooms/${room._id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.message || 'Could not update the room');
            setRooms(list => list.map(r => (r._id === room._id ? { ...r, status } : r)));
            toast.success(`Room ${room.roomNumber}: ${roomLabel(status).toLowerCase()}`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not update the room');
        } finally {
            setBusy(null);
        }
    };

    const setRequest = async (room: BoardRoom, req: Req, status: 'in_progress' | 'completed') => {
        setBusy(req._id);
        try {
            const res = await api.put(`/api/service-requests/${req._id}`, { status });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.message || 'Could not update the request');
            setRooms(list => list.map(r => (r._id !== room._id ? r : {
                ...r, requests: status === 'completed' ? r.requests.filter(q => q._id !== req._id) : r.requests.map(q => (q._id === req._id ? { ...q, status } : q)),
            })));
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not update the request');
        } finally {
            setBusy(null);
        }
    };

    const counts = useMemo(() => rooms.reduce((c, r) => ({ ...c, [r.status]: (c[r.status] || 0) + 1 }), {} as Record<string, number>), [rooms]);
    // Rooms to clean for guests arriving today come first
    const shown = useMemo(() => rooms
        .filter(r => filter === 'all' || r.status === filter)
        .sort((a, b) => Number(!!b.arrival && b.status === 'dirty') - Number(!!a.arrival && a.status === 'dirty')), [rooms, filter]);
    const queue = useMemo(() => rooms.flatMap(r => r.requests.map(q => ({ room: r, req: q }))).sort((a, b) => a.req.createdAt.localeCompare(b.req.createdAt)), [rooms]);

    return (
        <AdminLayout>
            <div className="mx-auto max-w-7xl p-6 md:p-10">
                <PageHeader
                    title="Housekeeping"
                    subtitle="Tap a room to mark it clean, dirty or out of order. Rooms with arrivals today are listed first."
                    actions={<>
                        {hotels.data.length > 1 && (
                            <select aria-label="Hotel" value={hotel} onChange={e => setHotel(e.target.value)}
                                className="rounded-lg border border-stone bg-white px-3 py-2 text-sm dark:border-graphite dark:bg-charcoal dark:text-cream cursor-pointer">
                                <option value="">All hotels</option>
                                {hotels.data.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
                            </select>
                        )}
                        <Button variant="secondary" size="sm" leftIcon={<BsArrowRepeat />} onClick={load} loading={loading}>Refresh</Button>
                    </>}
                />

                <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Room status">
                    {FILTERS.map(f => (
                        <button key={f.key} type="button" role="tab" aria-selected={filter === f.key} onClick={() => setFilter(f.key)}
                            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition-colors cursor-pointer ${filter === f.key
                                ? 'bg-bronze text-white dark:bg-gold dark:text-night'
                                : 'bg-white text-umber ring-1 ring-stone hover:ring-bronze dark:bg-charcoal dark:text-cream dark:ring-graphite'}`}>
                            {f.label} <span className="ml-1 opacity-70">{f.key === 'all' ? rooms.length : counts[f.key] || 0}</span>
                        </button>
                    ))}
                </div>

                <div className="grid gap-8 xl:grid-cols-[1fr_340px]">
                    <section aria-label="Rooms">
                        {loading && !rooms.length ? (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}</div>
                        ) : shown.length === 0 ? (
                            <EmptyState title={filter === 'dirty' ? 'Every room is clean' : 'No rooms here'} />
                        ) : (
                            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {shown.map(r => (
                                    <li key={r._id} className={`flex flex-col rounded-2xl border-2 p-4 ${TILE[r.status]}`}>
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="font-display text-3xl font-semibold text-ink dark:text-cream">{r.roomNumber}</p>
                                                <p className="text-xs text-taupe dark:text-gray-400">{r.type?.name}{hotels.data.length > 1 && r.hotel ? ` · ${r.hotel.name}` : ''}</p>
                                            </div>
                                            <Badge tone={statusTone(r.status)}>{roomLabel(r.status)}</Badge>
                                        </div>
                                        <div className="mt-3 flex-1 space-y-1.5 text-sm">
                                            {r.guest && (
                                                <p className="flex items-center gap-2 text-ink dark:text-cream"><BsPersonFill className="text-sky-600" aria-hidden="true" />
                                                    {r.guest.name}{r.guest.departsToday ? <Badge tone="warning" className="!py-0.5">Leaves today</Badge> : <span className="text-xs text-taupe"> until {formatDate(r.guest.checkOutDate, { day: 'numeric', month: 'short' })}</span>}
                                                </p>
                                            )}
                                            {r.arrival && (
                                                <p className="flex items-center gap-2 font-semibold text-bronze dark:text-gold"><BsBoxArrowInRight aria-hidden="true" />
                                                    Arrival today: {r.arrival.name}{r.arrival.arrivalTime ? ` (${r.arrival.arrivalTime})` : ''}
                                                </p>
                                            )}
                                            {r.requests.length > 0 && (
                                                <p className="flex items-center gap-2 text-amber-800 dark:text-amber-300"><BsExclamationTriangle aria-hidden="true" />{r.requests.length} open request{r.requests.length === 1 ? '' : 's'}</p>
                                            )}
                                        </div>
                                        {r.status !== 'occupied' && (
                                            <div className="mt-4 flex flex-wrap gap-2">
                                                {r.status !== 'available' && <Button size="sm" leftIcon={<BsCheck2Circle />} loading={busy === r._id} onClick={() => setStatus(r, 'available')}>Clean</Button>}
                                                {r.status !== 'dirty' && <Button size="sm" variant="secondary" leftIcon={<BsBrush />} disabled={busy === r._id} onClick={() => setStatus(r, 'dirty')}>Dirty</Button>}
                                                {r.status !== 'maintenance' && <Button size="sm" variant="ghost" leftIcon={<BsTools />} disabled={busy === r._id} onClick={() => setStatus(r, 'maintenance')}>Out of order</Button>}
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <aside aria-labelledby="queue-h" className="rounded-2xl border border-stone bg-white p-5 dark:border-graphite dark:bg-charcoal xl:sticky xl:top-6 xl:self-start">
                        <h2 id="queue-h" className="font-display text-xl text-ink dark:text-cream">Service requests</h2>
                        <p className="mb-4 text-xs text-taupe dark:text-gray-400">Oldest first</p>
                        {queue.length === 0 ? (
                            <p className="text-sm text-taupe dark:text-gray-400">No open requests.</p>
                        ) : (
                            <ul className="space-y-3">
                                {queue.map(({ room, req }) => (
                                    <li key={req._id} className="rounded-xl border border-stone p-3 dark:border-graphite">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="font-semibold text-ink dark:text-cream">Room {room.roomNumber} · {REQ_LABEL[req.type] || req.type}</p>
                                            <Badge tone={statusTone(req.status)}>{statusLabel(req.status)}</Badge>
                                        </div>
                                        {req.notes && <p className="mt-1 text-sm text-umber dark:text-gray-300">{req.notes}</p>}
                                        <p className="mt-1 text-xs text-taupe dark:text-gray-400">{new Date(req.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                                        <div className="mt-3 flex gap-2">
                                            {req.status === 'pending' && <Button size="sm" variant="secondary" disabled={busy === req._id} onClick={() => setRequest(room, req, 'in_progress')}>Start</Button>}
                                            <Button size="sm" loading={busy === req._id} onClick={() => setRequest(room, req, 'completed')}>Done</Button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </aside>
                </div>
            </div>
        </AdminLayout>
    );
};

export default Housekeeping;
