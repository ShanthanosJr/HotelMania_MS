import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BsArrowRepeat, BsCashCoin, BsArrowCounterclockwise, BsTrash } from 'react-icons/bs';
import AdminLayout from '../../components/AdminLayout';
import PageHeader from '../../components/admin/PageHeader';
import StatCard from '../../components/admin/StatCard';
import DataTable, { type Column } from '../../components/admin/DataTable';
import FilterTabs from '../../components/admin/FilterTabs';
import { Badge, Button, Input, Modal, Select, confirmDialog, statusTone, toast } from '../../components/ui';
import { apiJson, errorText } from '../../utils/adminApi';
import { formatMoney, statusLabel, type BookingRecord } from '../../utils/booking';
import { usePricing } from '../../hooks/usePublicData';

interface Txn {
    _id: string; transactionId: string; amount: number; type: string; status: 'succeeded' | 'failed' | 'refunded'; date: string;
    paymentDetails?: { last4?: string; method?: string; cardHolder?: string };
    booking?: { _id: string; confirmationCode?: string; totalPrice: number; status: string; paymentStatus: string; guestDetails?: { name?: string; email?: string }; user?: { name?: string; email?: string }; room?: { roomNumber?: string; type?: { name?: string } } };
}
type Filter = 'all' | 'succeeded' | 'refunded' | 'failed';

const METHOD: Record<string, string> = { payhere: 'PayHere (online)', cash: 'Cash', credit_card: 'Credit card', debit_card: 'Debit card', bank_transfer: 'Bank transfer' };
const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });

const ManageTransactions: React.FC = () => {
    const { currency } = usePricing();
    const [txns, setTxns] = useState<Txn[]>([]);
    const [bookings, setBookings] = useState<BookingRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<Filter>('all');
    const [recording, setRecording] = useState(false);
    const [form, setForm] = useState({ booking: '', amount: '', type: 'cash', reference: '' });
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [t, b] = await Promise.all([apiJson<Txn[]>('GET', '/api/transactions'), apiJson<BookingRecord[]>('GET', '/api/bookings')]);
            setTxns(t);
            setBookings(b);
        } catch (err) {
            toast.error(errorText(err, 'Could not load payments'));
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { load(); }, [load]);

    const money = (n: number) => formatMoney(n, currency);
    const summary = useMemo(() => {
        const now = new Date();
        const thisMonth = (iso: string) => { const d = new Date(iso); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); };
        const ok = txns.filter(t => t.status === 'succeeded');
        return {
            month: ok.filter(t => thisMonth(t.date)).reduce((s, t) => s + t.amount, 0),
            online: ok.filter(t => t.type === 'payhere' && thisMonth(t.date)).reduce((s, t) => s + t.amount, 0),
            refunded: txns.filter(t => t.status === 'refunded').reduce((s, t) => s + t.amount, 0),
            outstanding: bookings.filter(b => ['pending', 'confirmed', 'checked_in'].includes(b.status) && b.paymentStatus !== 'paid'
                && (b.status !== 'pending' || !b.holdExpiresAt || Date.parse(b.holdExpiresAt) > Date.now())),
        };
    }, [txns, bookings]);

    const guest = (t: Txn) => t.booking?.guestDetails?.name || t.booking?.user?.name || 'Guest';
    const rows = txns.filter(t => filter === 'all' || t.status === filter);

    const record = async () => {
        if (!form.booking) return toast.warning('Choose the booking being paid.');
        setSaving(true);
        try {
            const t = await apiJson<Txn>('POST', '/api/transactions', {
                booking: form.booking, amount: form.amount, type: form.type, transactionId: form.reference.trim() || undefined,
            });
            setTxns(list => [t, ...list]);
            setBookings(list => list.map(b => (b._id === form.booking ? { ...b, paymentStatus: 'paid', status: b.status === 'pending' ? 'confirmed' : b.status } : b)));
            setRecording(false);
            toast.success('Payment recorded. The booking is now paid.');
        } catch (err) { toast.error(errorText(err)); } finally { setSaving(false); }
    };

    const markRefunded = async (t: Txn) => {
        if (!(await confirmDialog({ title: 'Mark as refunded?', message: `Use this after you have sent ${money(t.amount)} back to ${guest(t)}. The booking is marked refunded. For cancelled bookings, prefer Bookings → Record refund, which also emails the guest.`, confirmLabel: 'Mark refunded' }))) return;
        try {
            const updated = await apiJson<Txn>('PUT', `/api/transactions/${t._id}`, { status: 'refunded' });
            setTxns(list => list.map(x => (x._id === t._id ? updated : x)));
            toast.success('Marked as refunded');
        } catch (err) { toast.error(errorText(err)); }
    };

    const remove = async (t: Txn) => {
        if (!(await confirmDialog({ title: 'Delete this payment record?', message: 'Only delete records entered by mistake. This does not change the booking’s payment status.', confirmLabel: 'Delete', tone: 'danger' }))) return;
        try {
            await apiJson('DELETE', `/api/transactions/${t._id}`);
            setTxns(list => list.filter(x => x._id !== t._id));
            toast.success('Payment record deleted');
        } catch (err) { toast.error(errorText(err)); }
    };

    const columns: Column<Txn>[] = [
        { key: 'date', header: 'Date', sortable: true, render: t => <span className="whitespace-nowrap text-xs">{when(t.date)}</span> },
        {
            key: 'guest', header: 'Booking', sortable: true, value: guest,
            render: t => (
                <div>
                    <p className="font-semibold">{guest(t)}</p>
                    <p className="text-xs text-taupe dark:text-gray-400">{t.booking?.confirmationCode || 'Booking removed'}{t.booking?.room?.roomNumber ? ` · room ${t.booking.room.roomNumber}` : ''}</p>
                </div>
            ),
        },
        {
            key: 'type', header: 'Method', sortable: true, value: t => METHOD[t.type] || t.type,
            render: t => (
                <div>
                    <p>{METHOD[t.type] || t.type}</p>
                    {(t.paymentDetails?.method || t.paymentDetails?.last4) && <p className="text-xs text-taupe">{[t.paymentDetails.method, t.paymentDetails.last4 ? `•••• ${t.paymentDetails.last4}` : ''].filter(Boolean).join(' ')}</p>}
                </div>
            ),
        },
        { key: 'transactionId', header: 'Reference', hideBelow: 'lg', render: t => <code className="text-xs">{t.transactionId}</code> },
        { key: 'amount', header: 'Amount', sortable: true, align: 'right', render: t => <span className={`font-semibold tabular-nums ${t.status === 'refunded' ? 'line-through opacity-60' : ''}`}>{money(t.amount)}</span> },
        { key: 'status', header: 'Status', sortable: true, render: t => <Badge tone={statusTone(t.status)}>{statusLabel(t.status)}</Badge> },
        {
            key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right',
            render: t => (
                <div className="flex justify-end gap-1">
                    {t.status === 'succeeded' && <button type="button" title="Mark refunded" aria-label="Mark refunded" onClick={() => markRefunded(t)} className="rounded-lg p-2 text-taupe hover:bg-linen hover:text-bronze dark:hover:bg-graphite cursor-pointer"><BsArrowCounterclockwise /></button>}
                    <button type="button" title="Delete record" aria-label="Delete record" onClick={() => remove(t)} className="rounded-lg p-2 text-taupe hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/30 cursor-pointer"><BsTrash /></button>
                </div>
            ),
        },
    ];

    const chosen = summary.outstanding.find(b => b._id === form.booking);

    return (
        <AdminLayout>
            <div className="mx-auto max-w-7xl p-6 md:p-10">
                <PageHeader title="Payments" subtitle="Online payments from PayHere and payments taken at the desk."
                    actions={<>
                        <Button variant="secondary" size="sm" leftIcon={<BsArrowRepeat />} onClick={load} loading={loading}>Refresh</Button>
                        <Button size="sm" leftIcon={<BsCashCoin />} onClick={() => { setForm({ booking: '', amount: '', type: 'cash', reference: '' }); setRecording(true); }}>Record payment</Button>
                    </>} />
                <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard label="Collected this month" value={money(summary.month)} />
                    <StatCard label="Online (PayHere)" value={money(summary.online)} hint="This month" />
                    <StatCard label="Refunded" value={money(summary.refunded)} hint="All time" />
                    <StatCard label="Awaiting payment" value={summary.outstanding.length} hint={money(summary.outstanding.reduce((s, b) => s + b.totalPrice, 0))} tone={summary.outstanding.length ? 'warning' : 'default'} to="/admin/bookings" />
                </div>
                <FilterTabs label="Payment status" value={filter} onChange={setFilter} tabs={[
                    { key: 'all', label: 'All', count: txns.length },
                    { key: 'succeeded', label: 'Succeeded', count: txns.filter(t => t.status === 'succeeded').length },
                    { key: 'refunded', label: 'Refunded', count: txns.filter(t => t.status === 'refunded').length },
                    { key: 'failed', label: 'Failed', count: txns.filter(t => t.status === 'failed').length },
                ]} />
                <DataTable columns={columns} rows={rows} rowKey={t => t._id} loading={loading}
                    searchText={t => `${guest(t)} ${t.booking?.confirmationCode || ''} ${t.transactionId} ${METHOD[t.type] || t.type} ${t.booking?.user?.email || ''}`}
                    searchPlaceholder="Guest, booking code, reference" exportName={`payments-${filter}`} initialSort={{ key: 'date', dir: 'desc' }}
                    emptyTitle="No payments yet" />
            </div>

            <Modal open={recording} onClose={() => setRecording(false)} title="Record a payment" description="For money taken at the desk. Online payments are recorded automatically."
                footer={<><Button variant="ghost" onClick={() => setRecording(false)}>Cancel</Button><Button onClick={record} loading={saving}>Record payment</Button></>}>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Select label="Booking" value={form.booking} containerClassName="sm:col-span-2"
                        onChange={e => { const b = summary.outstanding.find(x => x._id === e.target.value); setForm(f => ({ ...f, booking: e.target.value, amount: b ? String(b.totalPrice) : '' })); }}
                        hint={summary.outstanding.length ? undefined : 'No unpaid bookings right now'}>
                        <option value="">Choose an unpaid booking</option>
                        {summary.outstanding.map(b => <option key={b._id} value={b._id}>{b.confirmationCode} · {b.guestDetails?.name || b.user?.name} · {formatMoney(b.totalPrice, b.pricing?.currency || currency)}</option>)}
                    </Select>
                    <Input label="Amount" type="number" min={0} step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} hint={chosen ? `Total ${formatMoney(chosen.totalPrice, currency)}` : undefined} />
                    <Select label="Method" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                        <option value="cash">Cash</option>
                        <option value="credit_card">Credit card (terminal)</option>
                        <option value="debit_card">Debit card (terminal)</option>
                        <option value="bank_transfer">Bank transfer</option>
                    </Select>
                    <Input label="Reference (optional)" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} containerClassName="sm:col-span-2" hint="Terminal slip or bank reference. Never type card numbers." />
                </div>
            </Modal>
        </AdminLayout>
    );
};

export default ManageTransactions;
