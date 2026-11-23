import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    BsArrowRepeat, BsBoxArrowInRight, BsBoxArrowRight, BsCashCoin, BsDoorClosed, BsEnvelopeOpen,
    BsExclamationTriangle, BsHouseDoor, BsPeople, BsTools, BsGraphUp, BsCalendarX,
} from 'react-icons/bs';
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AdminLayout from '../../components/AdminLayout';
import PageHeader from '../../components/admin/PageHeader';
import StatCard from '../../components/admin/StatCard';
import { Button, Card, EmptyState, Skeleton } from '../../components/ui';
import { api } from '../../utils/api';
import { formatMoney } from '../../utils/booking';
import { useHotels } from '../../hooks/usePublicData';

interface Overview {
    date: string;
    currency: string;
    rooms: { total: number; sellable: number; outOfOrder: number; dirty: number };
    today: { occupancy: number; occupiedRooms: number; arrivals: number; departures: number; inHouse: number };
    month: { label: string; roomRevenue: number; roomNights: number; occupancy: number; adr: number; revpar: number; collected: number; cancellations: number };
    money: { unpaidBookings: number; unpaidAmount: number; refundsDue: number; refundsDueAmount: number };
    todo: { newEnquiries: number; openRequests: number };
    trend: { date: string; occupancy: number; revenue: number }[];
    activity: { _id: string; action: string; actorName?: string; summary?: string; createdAt: string }[];
}

const ACTION_LABELS: Record<string, string> = {
    'booking.create': 'New booking',
    'booking.update': 'Booking changed',
    'booking.cancel': 'Booking cancelled',
    'booking.refund': 'Refund recorded',
    'booking.check_in': 'Checked in',
    'booking.check_out': 'Checked out',
    'payment.record': 'Payment recorded',
    'room.status': 'Room status',
    'rates.update': 'Rates changed',
    'settings.update': 'Settings changed',
};

const ago = (iso: string) => {
    const mins = Math.round((Date.now() - Date.parse(iso)) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours} h ago`;
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const Dashboard: React.FC = () => {
    const hotels = useHotels();
    const [hotel, setHotel] = useState('');
    const [data, setData] = useState<Overview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get(`/api/admin/overview${hotel ? `?hotel=${hotel}` : ''}`);
            const body = await res.json();
            if (!res.ok) throw new Error(body.message || 'Could not load the dashboard');
            setData(body.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not load the dashboard');
        } finally {
            setLoading(false);
        }
    }, [hotel]);
    useEffect(() => { load(); }, [load]);

    const money = (n: number) => formatMoney(n, data?.currency);
    const todayLabel = data ? new Date(data.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }) : '';

    return (
        <AdminLayout>
            <div className="mx-auto max-w-7xl p-6 md:p-10">
                <PageHeader
                    title="Dashboard"
                    subtitle={todayLabel || 'Today at a glance'}
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

                {error ? (
                    <Card><EmptyState title="Couldn't load the dashboard" description={error} action={<Button onClick={load}>Try again</Button>} /></Card>
                ) : !data ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
                ) : (
                    <div className="space-y-8">
                        {/* Today */}
                        <section aria-labelledby="today-h">
                            <h2 id="today-h" className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-taupe dark:text-gray-400">Today</h2>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                <StatCard label="Occupancy tonight" value={`${data.today.occupancy}%`} hint={`${data.today.occupiedRooms} of ${data.rooms.sellable} rooms sold`} icon={<BsHouseDoor />} to="/admin/calendar" />
                                <StatCard label="Arrivals" value={data.today.arrivals} hint="Due to check in today" icon={<BsBoxArrowInRight />} to="/admin/frontdesk?tab=arrivals" />
                                <StatCard label="Departures" value={data.today.departures} hint="Due to check out" icon={<BsBoxArrowRight />} to="/admin/frontdesk?tab=departures" tone={data.today.departures ? 'warning' : 'default'} />
                                <StatCard label="In house" value={data.today.inHouse} hint="Guests checked in" icon={<BsPeople />} to="/admin/frontdesk?tab=inhouse" />
                            </div>
                        </section>

                        {/* Month */}
                        <section aria-labelledby="month-h">
                            <h2 id="month-h" className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-taupe dark:text-gray-400">{data.month.label} · on the books</h2>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                <StatCard label="Room revenue" value={money(data.month.roomRevenue)} hint={`${data.month.roomNights} room nights · ${money(data.month.collected)} collected`} icon={<BsGraphUp />} />
                                <StatCard label="Occupancy" value={`${data.month.occupancy}%`} hint="Room nights sold ÷ available" icon={<BsHouseDoor />} />
                                <StatCard label="ADR" value={money(data.month.adr)} hint="Average daily rate per sold room" icon={<BsCashCoin />} />
                                <StatCard label="RevPAR" value={money(data.month.revpar)} hint="Revenue per available room" icon={<BsCashCoin />} />
                            </div>
                        </section>

                        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                            {/* Trend */}
                            <Card>
                                <div className="mb-4 flex items-center justify-between">
                                    <h2 className="font-display text-xl text-ink dark:text-cream">Last 30 days</h2>
                                    <p className="text-xs text-taupe dark:text-gray-400">Bars: room revenue · Line: occupancy</p>
                                </div>
                                <div className="h-72">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={data.trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-stone dark:text-graphite" vertical={false} />
                                            <XAxis dataKey="date" tickFormatter={d => d.slice(8)} tick={{ fontSize: 11, fill: '#8D6E63' }} tickLine={false} axisLine={false} interval={2} />
                                            <YAxis yAxisId="rev" tick={{ fontSize: 11, fill: '#8D6E63' }} tickLine={false} axisLine={false} width={56}
                                                tickFormatter={v => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                                            <YAxis yAxisId="occ" orientation="right" domain={[0, 100]} tick={{ fontSize: 11, fill: '#8D6E63' }} tickLine={false} axisLine={false} width={36} tickFormatter={v => `${v}%`} />
                                            <Tooltip
                                                formatter={(v, name) => (name === 'occupancy' ? [`${v}%`, 'Occupancy'] : [money(Number(v)), 'Room revenue'])}
                                                labelFormatter={d => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })}
                                                contentStyle={{ borderRadius: 12, border: '1px solid #E6E2D3', fontSize: 12 }}
                                            />
                                            <Bar yAxisId="rev" dataKey="revenue" fill="#D4AF37" radius={[4, 4, 0, 0]} maxBarSize={18} />
                                            <Line yAxisId="occ" dataKey="occupancy" stroke="#8B6914" strokeWidth={2} dot={false} type="monotone" />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>

                            {/* Needs attention */}
                            <Card>
                                <h2 className="mb-4 font-display text-xl text-ink dark:text-cream">Needs attention</h2>
                                <ul className="space-y-3 text-sm">
                                    {[
                                        { show: data.money.unpaidBookings > 0, icon: <BsCashCoin />, text: `${data.money.unpaidBookings} unpaid booking${data.money.unpaidBookings === 1 ? '' : 's'} · ${money(data.money.unpaidAmount)}`, to: '/admin/bookings', tone: 'text-amber-700 dark:text-amber-300' },
                                        { show: data.money.refundsDue > 0, icon: <BsExclamationTriangle />, text: `${data.money.refundsDue} refund${data.money.refundsDue === 1 ? '' : 's'} due · ${money(data.money.refundsDueAmount)}`, to: '/admin/bookings', tone: 'text-red-700 dark:text-red-300' },
                                        { show: data.rooms.dirty > 0, icon: <BsDoorClosed />, text: `${data.rooms.dirty} room${data.rooms.dirty === 1 ? '' : 's'} waiting to be cleaned`, to: '/admin/housekeeping', tone: 'text-amber-700 dark:text-amber-300' },
                                        { show: data.rooms.outOfOrder > 0, icon: <BsTools />, text: `${data.rooms.outOfOrder} room${data.rooms.outOfOrder === 1 ? '' : 's'} out of order`, to: '/admin/housekeeping', tone: 'text-red-700 dark:text-red-300' },
                                        { show: data.todo.openRequests > 0, icon: <BsTools />, text: `${data.todo.openRequests} open service request${data.todo.openRequests === 1 ? '' : 's'}`, to: '/admin/housekeeping', tone: 'text-umber dark:text-cream' },
                                        { show: data.todo.newEnquiries > 0, icon: <BsEnvelopeOpen />, text: `${data.todo.newEnquiries} new enquir${data.todo.newEnquiries === 1 ? 'y' : 'ies'}`, to: '/admin/enquiries', tone: 'text-umber dark:text-cream' },
                                        { show: data.month.cancellations > 0, icon: <BsCalendarX />, text: `${data.month.cancellations} cancellation${data.month.cancellations === 1 ? '' : 's'} this month`, to: '/admin/bookings', tone: 'text-umber dark:text-cream' },
                                    ].filter(x => x.show).map(x => (
                                        <li key={x.text}>
                                            <Link to={x.to} className={`flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-linen dark:hover:bg-graphite/50 ${x.tone}`}>
                                                <span aria-hidden="true">{x.icon}</span>{x.text}
                                            </Link>
                                        </li>
                                    ))}
                                    {!(data.money.unpaidBookings || data.money.refundsDue || data.rooms.dirty || data.rooms.outOfOrder || data.todo.openRequests || data.todo.newEnquiries || data.month.cancellations) && (
                                        <li className="px-3 py-2 text-taupe dark:text-gray-400">All clear. Nothing needs attention.</li>
                                    )}
                                </ul>
                            </Card>
                        </div>

                        {/* Activity */}
                        <Card padded={false}>
                            <div className="flex items-center justify-between px-6 pt-6">
                                <h2 className="font-display text-xl text-ink dark:text-cream">Recent activity</h2>
                            </div>
                            {data.activity.length === 0 ? (
                                <EmptyState title="No activity yet" description="Check-ins, payments and changes made by staff will appear here." />
                            ) : (
                                <ul className="mt-4 divide-y divide-stone dark:divide-graphite">
                                    {data.activity.map(a => (
                                        <li key={a._id} className="grid gap-1 px-6 py-3 text-sm sm:grid-cols-[160px_1fr_auto] sm:items-center sm:gap-4">
                                            <span className="font-semibold text-ink dark:text-cream">{ACTION_LABELS[a.action] || a.action}</span>
                                            <span className="text-umber dark:text-gray-300">{a.summary}<span className="text-taupe dark:text-gray-500"> · {a.actorName || 'System'}</span></span>
                                            <time dateTime={a.createdAt} className="text-xs text-taupe dark:text-gray-400">{ago(a.createdAt)}</time>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Card>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default Dashboard;
