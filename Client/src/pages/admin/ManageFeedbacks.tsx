import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BsArrowRepeat, BsEye, BsEyeSlash, BsPlusLg, BsTrash } from 'react-icons/bs';
import AdminLayout from '../../components/AdminLayout';
import PageHeader from '../../components/admin/PageHeader';
import StatCard from '../../components/admin/StatCard';
import DataTable, { type Column } from '../../components/admin/DataTable';
import FilterTabs from '../../components/admin/FilterTabs';
import { Badge, Button, Modal, Select, Textarea, confirmDialog, statusTone, toast } from '../../components/ui';
import { apiJson, errorText } from '../../utils/adminApi';
import { getStoredUser } from '../../utils/auth';
import { statusLabel } from '../../utils/booking';

interface RoomRef { _id: string; roomNumber?: string; type?: { name?: string }; hotel?: { name?: string } }
interface Review { _id: string; rating: number; comment: string; hidden?: boolean; createdAt: string; user?: { name?: string; email?: string }; room?: RoomRef }
interface Request { _id: string; type: 'cleaning' | 'food' | 'repair'; status: 'pending' | 'in_progress' | 'completed'; notes?: string; createdAt: string; room?: RoomRef }
type Tab = 'reviews' | 'requests';

const REQ_LABEL: Record<string, string> = { cleaning: 'Cleaning', food: 'In-room dining', repair: 'Repair' };
const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
const roomText = (r?: RoomRef) => (r ? `Room ${r.roomNumber}${r.type?.name ? ` · ${r.type.name}` : ''}` : 'Room removed');
const Stars: React.FC<{ n: number }> = ({ n }) => <span className="whitespace-nowrap text-gold" aria-label={`${n} of 5 stars`}>{'★'.repeat(n)}<span className="opacity-25">{'★'.repeat(5 - n)}</span></span>;

const ManageFeedbacks: React.FC = () => {
    const role = getStoredUser()?.role;
    const isAdmin = role === 'admin';
    const [params, setParams] = useSearchParams();
    const requested = params.get('tab');
    const tab: Tab = requested === 'reviews' || requested === 'requests' ? requested : role === 'housekeeping' ? 'requests' : 'reviews';
    const [reviews, setReviews] = useState<Review[]>([]);
    const [requests, setRequests] = useState<Request[]>([]);
    const [rooms, setRooms] = useState<RoomRef[]>([]);
    const [loading, setLoading] = useState(true);
    const [reqFilter, setReqFilter] = useState<'open' | 'completed' | 'all'>('open');
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ room: '', type: 'cleaning', notes: '' });
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [rv, rq, rm] = await Promise.all([
                apiJson<Review[]>('GET', '/api/reviews').catch(() => []),
                apiJson<Request[]>('GET', '/api/service-requests'),
                apiJson<RoomRef[]>('GET', '/api/rooms'),
            ]);
            setReviews(rv); setRequests(rq); setRooms(rm);
        } catch (err) {
            toast.error(errorText(err, 'Could not load feedback'));
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { load(); }, [load]);

    const avg = useMemo(() => (reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '—'), [reviews]);
    const published = reviews.filter(r => !r.hidden && r.rating >= 4 && r.comment.trim().length >= 20).length;

    const toggleHidden = async (r: Review) => {
        try {
            const updated = await apiJson<Review>('PUT', `/api/reviews/${r._id}`, { hidden: !r.hidden });
            setReviews(list => list.map(x => (x._id === r._id ? updated : x)));
            toast.success(updated.hidden ? 'Hidden from the website' : 'Shown on the website (if 4★ or more)');
        } catch (err) { toast.error(errorText(err)); }
    };
    const removeReview = async (r: Review) => {
        if (!(await confirmDialog({ title: 'Delete this review?', message: 'Consider hiding it instead; deleting cannot be undone.', confirmLabel: 'Delete', tone: 'danger' }))) return;
        try {
            await apiJson('DELETE', `/api/reviews/${r._id}`);
            setReviews(list => list.filter(x => x._id !== r._id));
            toast.success('Review deleted');
        } catch (err) { toast.error(errorText(err)); }
    };

    const setReqStatus = async (q: Request, status: Request['status']) => {
        try {
            const updated = await apiJson<Request>('PUT', `/api/service-requests/${q._id}`, { status });
            setRequests(list => list.map(x => (x._id === q._id ? updated : x)));
        } catch (err) { toast.error(errorText(err)); }
    };
    const removeReq = async (q: Request) => {
        if (!(await confirmDialog({ title: 'Delete this request?', confirmLabel: 'Delete', tone: 'danger' }))) return;
        try {
            await apiJson('DELETE', `/api/service-requests/${q._id}`);
            setRequests(list => list.filter(x => x._id !== q._id));
        } catch (err) { toast.error(errorText(err)); }
    };
    const createReq = async () => {
        if (!form.room) return toast.warning('Choose a room.');
        setSaving(true);
        try {
            const created = await apiJson<Request>('POST', '/api/service-requests', { room: form.room, type: form.type, notes: form.notes.trim() || undefined });
            setRequests(list => [created, ...list]);
            setCreating(false);
            toast.success('Request added to the housekeeping queue');
        } catch (err) { toast.error(errorText(err)); } finally { setSaving(false); }
    };

    const iconBtn = 'rounded-lg p-2 text-taupe hover:bg-linen hover:text-bronze dark:hover:bg-graphite cursor-pointer';
    const reviewColumns: Column<Review>[] = [
        { key: 'rating', header: 'Rating', sortable: true, render: r => <Stars n={r.rating} /> },
        {
            key: 'comment', header: 'Review',
            render: r => (
                <div className="max-w-xl">
                    <p className="line-clamp-2" title={r.comment}>{r.comment}</p>
                    <p className="mt-1 text-xs text-taupe dark:text-gray-400">{r.user?.name || 'Former guest'} · {roomText(r.room)}{r.room?.hotel?.name ? ` · ${r.room.hotel.name}` : ''}</p>
                </div>
            ),
        },
        { key: 'createdAt', header: 'Date', sortable: true, render: r => <span className="whitespace-nowrap text-xs">{when(r.createdAt)}</span>, hideBelow: 'md' },
        {
            key: 'hidden', header: 'Website', sortable: true, value: r => (r.hidden ? 1 : 0),
            render: r => r.hidden ? <Badge tone="danger">Hidden</Badge> : r.rating >= 4 && r.comment.trim().length >= 20 ? <Badge tone="success">Shown</Badge> : <Badge>Not featured</Badge>,
        },
        ...(isAdmin ? [{
            key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right' as const,
            render: (r: Review) => (
                <div className="flex justify-end gap-1">
                    <button type="button" className={iconBtn} title={r.hidden ? 'Show on website' : 'Hide from website'} aria-label={r.hidden ? 'Show on website' : 'Hide from website'} onClick={() => toggleHidden(r)}>{r.hidden ? <BsEye /> : <BsEyeSlash />}</button>
                    <button type="button" className={`${iconBtn} hover:!text-red-700`} aria-label="Delete review" onClick={() => removeReview(r)}><BsTrash /></button>
                </div>
            ),
        }] : []),
    ];

    const shownRequests = requests.filter(q => reqFilter === 'all' || (reqFilter === 'open' ? q.status !== 'completed' : q.status === 'completed'));
    const requestColumns: Column<Request>[] = [
        { key: 'room', header: 'Room', sortable: true, value: q => q.room?.roomNumber, render: q => <div><p className="font-semibold">{roomText(q.room)}</p><p className="text-xs text-taupe">{q.room?.hotel?.name}</p></div> },
        { key: 'type', header: 'Request', sortable: true, value: q => REQ_LABEL[q.type], render: q => <div><p>{REQ_LABEL[q.type]}</p>{q.notes && <p className="max-w-sm text-xs text-taupe" title={q.notes}>{q.notes}</p>}</div> },
        { key: 'createdAt', header: 'Asked', sortable: true, render: q => <span className="whitespace-nowrap text-xs">{when(q.createdAt)}</span> },
        { key: 'status', header: 'Status', sortable: true, render: q => <Badge tone={statusTone(q.status)}>{statusLabel(q.status)}</Badge> },
        {
            key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right',
            render: q => (
                <div className="flex justify-end gap-2">
                    {q.status === 'pending' && <Button size="sm" variant="secondary" onClick={() => setReqStatus(q, 'in_progress')}>Start</Button>}
                    {q.status !== 'completed' ? <Button size="sm" onClick={() => setReqStatus(q, 'completed')}>Done</Button>
                        : <Button size="sm" variant="ghost" onClick={() => setReqStatus(q, 'pending')}>Reopen</Button>}
                    {isAdmin && <button type="button" className={`${iconBtn} hover:!text-red-700`} aria-label="Delete request" onClick={() => removeReq(q)}><BsTrash /></button>}
                </div>
            ),
        },
    ];

    return (
        <AdminLayout>
            <div className="mx-auto max-w-7xl p-6 md:p-10">
                <PageHeader title="Feedback & requests" subtitle="Guest reviews and in-stay service requests."
                    actions={<>
                        <Button variant="secondary" size="sm" leftIcon={<BsArrowRepeat />} onClick={load} loading={loading}>Refresh</Button>
                        {tab === 'requests' && <Button size="sm" leftIcon={<BsPlusLg />} onClick={() => { setForm({ room: '', type: 'cleaning', notes: '' }); setCreating(true); }}>New request</Button>}
                    </>} />
                <FilterTabs label="Feedback view" value={tab} onChange={k => setParams({ tab: k }, { replace: true })} tabs={[
                    { key: 'reviews', label: 'Reviews', count: reviews.length },
                    { key: 'requests', label: 'Service requests', count: requests.filter(q => q.status !== 'completed').length },
                ]} />

                {tab === 'reviews' ? (
                    <>
                        <div className="mb-6 grid gap-4 sm:grid-cols-3">
                            <StatCard label="Average rating" value={avg === '—' ? avg : `${avg} ★`} hint={`${reviews.length} review${reviews.length === 1 ? '' : 's'}`} />
                            <StatCard label="On the website" value={published} hint="4★ or more, not hidden" />
                            <StatCard label="Low ratings" value={reviews.filter(r => r.rating <= 2).length} hint="2★ or less: follow up" tone={reviews.some(r => r.rating <= 2) ? 'warning' : 'default'} />
                        </div>
                        <DataTable columns={reviewColumns} rows={reviews} rowKey={r => r._id} loading={loading}
                            searchText={r => `${r.comment} ${r.user?.name || ''} ${r.room?.roomNumber || ''} ${r.room?.type?.name || ''}`}
                            exportName="reviews" initialSort={{ key: 'createdAt', dir: 'desc' }}
                            emptyTitle="No reviews yet" emptyText="Guests can review a stay from My Bookings after they check out."
                            rowClassName={r => (r.hidden ? 'opacity-60' : '')} />
                        {isAdmin && <p className="mt-3 text-xs text-taupe">Reviews of 4★ or more with at least 20 characters appear on the home page with the guest's first name and last initial. Hide any you don't want shown.</p>}
                    </>
                ) : (
                    <>
                        <FilterTabs label="Request status" value={reqFilter} onChange={setReqFilter} tabs={[
                            { key: 'open', label: 'Open', count: requests.filter(q => q.status !== 'completed').length },
                            { key: 'completed', label: 'Completed', count: requests.filter(q => q.status === 'completed').length },
                            { key: 'all', label: 'All', count: requests.length },
                        ]} />
                        <DataTable columns={requestColumns} rows={shownRequests} rowKey={q => q._id} loading={loading}
                            searchText={q => `${q.room?.roomNumber || ''} ${REQ_LABEL[q.type]} ${q.notes || ''}`}
                            exportName={`service-requests-${reqFilter}`} initialSort={{ key: 'createdAt', dir: reqFilter === 'open' ? 'asc' : 'desc' }}
                            emptyTitle={reqFilter === 'open' ? 'No open requests' : 'Nothing here'} />
                    </>
                )}
            </div>

            <Modal open={creating} onClose={() => setCreating(false)} title="New service request" description="For requests taken by phone or at the desk."
                footer={<><Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button><Button onClick={createReq} loading={saving}>Add request</Button></>}>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Select label="Room" value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))}>
                        <option value="">Choose a room</option>
                        {[...rooms].sort((a, b) => String(a.roomNumber).localeCompare(String(b.roomNumber), undefined, { numeric: true }))
                            .map(r => <option key={r._id} value={r._id}>{r.roomNumber} · {r.type?.name}{r.hotel?.name ? ` · ${r.hotel.name}` : ''}</option>)}
                    </Select>
                    <Select label="Type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                        <option value="cleaning">Cleaning</option><option value="food">In-room dining</option><option value="repair">Repair</option>
                    </Select>
                    <Textarea label="Notes" rows={3} maxLength={500} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} containerClassName="sm:col-span-2" />
                </div>
            </Modal>
        </AdminLayout>
    );
};

export default ManageFeedbacks;
