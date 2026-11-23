import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BsEnvelope, BsTelephone, BsArrowRepeat } from 'react-icons/bs';
import AdminLayout from '../../components/AdminLayout';
import { Badge, Button, Card, EmptyState, Modal, Skeleton, Textarea, toast } from '../../components/ui';
import type { BadgeTone } from '../../components/ui';
import { api } from '../../utils/api';
import { formatDate } from '../../utils/booking';
import { ENQUIRY_TOPICS } from '../../config/content';

type Status = 'new' | 'in_progress' | 'closed';
interface Enquiry {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    topic: string;
    checkIn?: string;
    checkOut?: string;
    guests?: number;
    message: string;
    status: Status;
    staffNote?: string;
    handledBy?: { name?: string };
    createdAt: string;
}

const STATUS: Record<Status, { label: string; tone: BadgeTone }> = {
    new: { label: 'New', tone: 'warning' },
    in_progress: { label: 'In progress', tone: 'info' },
    closed: { label: 'Closed', tone: 'neutral' },
};
const topicLabel = (t: string) => ENQUIRY_TOPICS.find(x => x.value === t)?.label || t;
const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const ManageEnquiries: React.FC = () => {
    const [items, setItems] = useState<Enquiry[]>([]);
    const [counts, setCounts] = useState<Partial<Record<Status, number>>>({});
    const [filter, setFilter] = useState<Status | 'all'>('new');
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [open, setOpen] = useState<Enquiry | null>(null);
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/api/enquiries');
            const body = await res.json();
            if (!res.ok) throw new Error(body.message || 'Could not load enquiries');
            setItems(body.data);
            setCounts(body.counts || {});
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not load enquiries');
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { load(); }, [load]);

    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();
        return items.filter(e => (filter === 'all' || e.status === filter)
            && (!q || [e.name, e.email, e.phone, e.message].some(v => v?.toLowerCase().includes(q))));
    }, [items, filter, query]);

    const update = async (e: Enquiry, patch: Partial<Pick<Enquiry, 'status' | 'staffNote'>>) => {
        setSaving(true);
        try {
            const res = await api.request(`/api/enquiries/${e._id}`, { method: 'PATCH', body: JSON.stringify(patch) });
            const body = await res.json();
            if (!res.ok) throw new Error(body.message || 'Could not update');
            setItems(list => list.map(x => (x._id === e._id ? body.data : x)));
            if (patch.status && patch.status !== e.status) {
                setCounts(c => ({ ...c, [e.status]: Math.max(0, (c[e.status] || 1) - 1), [patch.status!]: (c[patch.status!] || 0) + 1 }));
            }
            setOpen(o => (o && o._id === e._id ? body.data : o));
            toast.success(patch.status ? `Marked as ${STATUS[patch.status].label.toLowerCase()}` : 'Note saved');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not update');
        } finally {
            setSaving(false);
        }
    };

    const total = (counts.new || 0) + (counts.in_progress || 0) + (counts.closed || 0);
    const tabs: { key: Status | 'all'; label: string; n: number }[] = [
        { key: 'new', label: 'New', n: counts.new || 0 },
        { key: 'in_progress', label: 'In progress', n: counts.in_progress || 0 },
        { key: 'closed', label: 'Closed', n: counts.closed || 0 },
        { key: 'all', label: 'All', n: total },
    ];

    return (
        <AdminLayout>
            <div className="mx-auto max-w-6xl p-6 md:p-10">
                <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="font-display text-3xl font-semibold text-ink dark:text-cream">Enquiries</h1>
                        <p className="mt-1 text-sm text-taupe dark:text-gray-400">Messages from the website Contact form. Reply by email or phone, then close them here.</p>
                    </div>
                    <Button variant="secondary" size="sm" leftIcon={<BsArrowRepeat />} onClick={load} loading={loading}>Refresh</Button>
                </div>

                <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Status">
                        {tabs.map(t => (
                            <button key={t.key} role="tab" aria-selected={filter === t.key} type="button" onClick={() => setFilter(t.key)}
                                className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition-colors cursor-pointer ${filter === t.key
                                    ? 'bg-bronze text-white dark:bg-gold dark:text-night'
                                    : 'bg-white text-umber ring-1 ring-stone hover:ring-bronze dark:bg-charcoal dark:text-cream dark:ring-graphite'}`}>
                                {t.label} <span className="ml-1 opacity-70">{t.n}</span>
                            </button>
                        ))}
                    </div>
                    <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, email, message"
                        aria-label="Search enquiries"
                        className="w-full rounded-lg border border-stone bg-white px-4 py-2.5 text-sm md:w-80 dark:border-graphite dark:bg-charcoal dark:text-cream" />
                </div>

                <Card padded={false} className="overflow-hidden">
                    {loading && !items.length ? (
                        <div className="space-y-4 p-6">{[0, 1, 2].map(i => <Skeleton key={i} className="h-16" />)}</div>
                    ) : error ? (
                        <EmptyState title="Couldn't load enquiries" description={error} action={<Button onClick={load}>Try again</Button>} />
                    ) : shown.length === 0 ? (
                        <EmptyState title={filter === 'new' ? 'No new enquiries' : 'Nothing here'} description="New messages from the Contact page will appear here." />
                    ) : (
                        <ul className="divide-y divide-stone dark:divide-graphite">
                            {shown.map(e => (
                                <li key={e._id}>
                                    <button type="button" onClick={() => { setOpen(e); setNote(e.staffNote || ''); }}
                                        className="grid w-full gap-2 px-6 py-5 text-left transition-colors hover:bg-linen md:grid-cols-[1fr_auto] md:gap-6 dark:hover:bg-graphite/50 cursor-pointer">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-semibold text-ink dark:text-cream">{e.name}</span>
                                                <span className="text-sm text-taupe dark:text-gray-400">{e.email}</span>
                                                <Badge tone="brand">{topicLabel(e.topic)}</Badge>
                                            </div>
                                            <p className="mt-1 truncate text-sm text-umber dark:text-gray-300">{e.message}</p>
                                        </div>
                                        <div className="flex items-center gap-3 md:flex-col md:items-end md:gap-1">
                                            <Badge tone={STATUS[e.status].tone}>{STATUS[e.status].label}</Badge>
                                            <span className="text-xs text-taupe dark:text-gray-400">{when(e.createdAt)}</span>
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>

            <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `${topicLabel(open.topic)} from ${open.name}` : ''} size="lg">
                {open && (
                    <div className="space-y-6">
                        <div className="flex flex-wrap gap-3 text-sm">
                            <a href={`mailto:${open.email}?subject=${encodeURIComponent(`Re: your ${topicLabel(open.topic).toLowerCase()} enquiry`)}`}
                                className="inline-flex items-center gap-2 rounded-lg bg-parchment px-3 py-2 font-semibold text-bronze dark:bg-gold/15 dark:text-gold">
                                <BsEnvelope /> {open.email}
                            </a>
                            {open.phone && (
                                <a href={`tel:${open.phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-2 rounded-lg bg-parchment px-3 py-2 font-semibold text-bronze dark:bg-gold/15 dark:text-gold">
                                    <BsTelephone /> {open.phone}
                                </a>
                            )}
                        </div>
                        <dl className="grid gap-4 text-sm sm:grid-cols-3">
                            <div><dt className="text-xs uppercase tracking-[0.14em] text-taupe dark:text-gray-400">Received</dt><dd className="mt-1">{when(open.createdAt)}</dd></div>
                            {open.checkIn && <div><dt className="text-xs uppercase tracking-[0.14em] text-taupe dark:text-gray-400">Dates</dt><dd className="mt-1">{formatDate(open.checkIn, { day: 'numeric', month: 'short' })}{open.checkOut ? ` – ${formatDate(open.checkOut, { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}</dd></div>}
                            {open.guests && <div><dt className="text-xs uppercase tracking-[0.14em] text-taupe dark:text-gray-400">Guests</dt><dd className="mt-1">{open.guests}</dd></div>}
                        </dl>
                        <p className="whitespace-pre-wrap rounded-xl border-l-4 border-gold bg-linen p-4 text-[0.95rem] leading-7 text-ink dark:bg-night dark:text-cream">{open.message}</p>
                        <Textarea label="Internal note" rows={3} value={note} onChange={e => setNote(e.target.value)} hint={open.handledBy?.name ? `Last updated by ${open.handledBy.name}` : 'Only staff can see this'} />
                        <div className="flex flex-wrap justify-between gap-3">
                            <Button variant="ghost" size="sm" disabled={saving || note === (open.staffNote || '')} onClick={() => update(open, { staffNote: note })}>Save note</Button>
                            <div className="flex flex-wrap gap-2">
                                {open.status !== 'in_progress' && <Button variant="secondary" size="sm" loading={saving} onClick={() => update(open, { status: 'in_progress' })}>Mark in progress</Button>}
                                {open.status !== 'closed'
                                    ? <Button size="sm" loading={saving} onClick={() => update(open, { status: 'closed', staffNote: note })}>Close enquiry</Button>
                                    : <Button variant="secondary" size="sm" loading={saving} onClick={() => update(open, { status: 'new' })}>Reopen</Button>}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </AdminLayout>
    );
};

export default ManageEnquiries;
