import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BsArrowRepeat, BsPersonPlus, BsPencil, BsTrash } from 'react-icons/bs';
import AdminLayout from '../../components/AdminLayout';
import PageHeader from '../../components/admin/PageHeader';
import DataTable, { type Column } from '../../components/admin/DataTable';
import FilterTabs from '../../components/admin/FilterTabs';
import { Badge, Button, Input, Modal, Select, confirmDialog, statusTone, toast } from '../../components/ui';
import type { BadgeTone } from '../../components/ui';
import { apiJson, errorText, photoSrc } from '../../utils/adminApi';
import { getStoredUser } from '../../utils/auth';
import { formatDate, formatMoney, hotelOf, statusLabel, type BookingRecord } from '../../utils/booking';
import { usePricing } from '../../hooks/usePublicData';

type Role = 'guest' | 'admin' | 'receptionist' | 'housekeeping';
interface User { _id: string; userId?: string; name: string; email: string; phone?: string; role: Role; profilePhoto?: string; createdAt?: string }
type Filter = 'all' | 'guests' | 'staff';

const ROLE_TONE: Record<Role, BadgeTone> = { admin: 'brand', receptionist: 'info', housekeeping: 'warning', guest: 'neutral' };
const ROLE_HELP: Record<Role, string> = {
    guest: 'Books stays on the website',
    receptionist: 'Front desk, calendar, bookings, enquiries',
    housekeeping: 'Housekeeping board and service requests',
    admin: 'Everything, including rates, users and money',
};
const blank = { name: '', email: '', phone: '', role: 'guest' as Role, password: '' };

const ManageUsers: React.FC = () => {
    const me = getStoredUser();
    const { currency } = usePricing();
    const [users, setUsers] = useState<User[]>([]);
    const [bookings, setBookings] = useState<BookingRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<Filter>('all');
    const [editing, setEditing] = useState<User | 'new' | null>(null);
    const [form, setForm] = useState(blank);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState<User | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [u, b] = await Promise.all([apiJson<User[]>('GET', '/api/users'), apiJson<BookingRecord[]>('GET', '/api/bookings').catch(() => [])]);
            setUsers(u);
            setBookings(b);
        } catch (err) {
            toast.error(errorText(err, 'Could not load users'));
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { load(); }, [load]);

    // Stay history per guest
    const stats = useMemo(() => {
        const m = new Map<string, { stays: number; spent: number; last?: string; list: BookingRecord[] }>();
        for (const b of bookings) {
            const id = b.user?._id;
            if (!id) continue;
            const s = m.get(id) || { stays: 0, spent: 0, list: [] };
            s.list.push(b);
            if (b.status === 'checked_out' || b.status === 'checked_in') s.stays += 1;
            if (b.paymentStatus === 'paid') s.spent += b.totalPrice;
            if (b.status !== 'cancelled' && (!s.last || b.checkInDate > s.last)) s.last = b.checkInDate;
            m.set(id, s);
        }
        return m;
    }, [bookings]);

    const rows = users.filter(u => filter === 'all' || (filter === 'guests' ? u.role === 'guest' : u.role !== 'guest'));
    const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

    const save = async () => {
        if (!form.name.trim() || !form.email.trim()) return toast.warning('Name and email are required.');
        if (editing === 'new' && form.password.length < 8) return toast.warning('Use a password of at least 8 characters.');
        if (editing !== 'new' && form.password && form.password.length < 8) return toast.warning('A new password needs at least 8 characters.');
        setSaving(true);
        try {
            const payload: Record<string, string> = { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), role: form.role };
            if (form.password) payload.password = form.password;
            if (editing === 'new') {
                const created = await apiJson<User>('POST', '/api/users', payload);
                setUsers(list => [created, ...list]);
                toast.success(`${created.name} can now sign in`);
            } else if (editing) {
                const updated = await apiJson<User>('PUT', `/api/users/${editing._id}`, payload);
                setUsers(list => list.map(u => (u._id === updated._id ? updated : u)));
                toast.success(form.password ? 'Saved. Their other sessions were signed out.' : 'Saved');
            }
            setEditing(null);
        } catch (err) {
            toast.error(errorText(err, 'Could not save'));
        } finally {
            setSaving(false);
        }
    };

    const remove = async (u: User) => {
        if (!(await confirmDialog({ title: `Delete ${u.name}?`, message: 'They will no longer be able to sign in. Their past bookings stay on record.', confirmLabel: 'Delete', tone: 'danger' }))) return;
        try {
            await apiJson('DELETE', `/api/users/${u._id}`);
            setUsers(list => list.filter(x => x._id !== u._id));
            setProfile(null);
            toast.success('User deleted');
        } catch (err) { toast.error(errorText(err)); }
    };

    const startEdit = (u: User) => { setForm({ name: u.name, email: u.email, phone: u.phone || '', role: u.role, password: '' }); setEditing(u); };

    const columns: Column<User>[] = [
        {
            key: 'name', header: 'Name', sortable: true,
            render: u => (
                <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-parchment font-semibold text-bronze dark:bg-gold/15 dark:text-gold">
                        {u.profilePhoto ? <img src={photoSrc(u.profilePhoto)} alt="" className="h-full w-full object-cover" /> : u.name.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                        <p className="font-semibold">{u.name}{u._id === me?.id && <span className="ml-2 text-xs font-normal text-taupe">(you)</span>}</p>
                        <p className="truncate text-xs text-taupe dark:text-gray-400">{u.email}</p>
                    </div>
                </div>
            ),
        },
        { key: 'role', header: 'Role', sortable: true, render: u => <Badge tone={ROLE_TONE[u.role]}>{u.role}</Badge> },
        { key: 'phone', header: 'Phone', hideBelow: 'lg', render: u => u.phone || '—' },
        { key: 'stays', header: 'Stays', sortable: true, align: 'right', value: u => stats.get(u._id)?.stays || 0, hideBelow: 'md' },
        { key: 'spent', header: 'Paid', sortable: true, align: 'right', value: u => stats.get(u._id)?.spent || 0, render: u => <span className="tabular-nums">{formatMoney(stats.get(u._id)?.spent || 0, currency)}</span>, hideBelow: 'md' },
        { key: 'createdAt', header: 'Joined', sortable: true, render: u => (u.createdAt ? formatDate(u.createdAt, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'), hideBelow: 'lg' },
    ];

    const p = profile ? stats.get(profile._id) : undefined;

    return (
        <AdminLayout>
            <div className="mx-auto max-w-7xl p-6 md:p-10">
                <PageHeader title="Users" subtitle="Guests and staff accounts. Click someone to see their stays."
                    actions={<>
                        <Button variant="secondary" size="sm" leftIcon={<BsArrowRepeat />} onClick={load} loading={loading}>Refresh</Button>
                        <Button size="sm" leftIcon={<BsPersonPlus />} onClick={() => { setForm(blank); setEditing('new'); }}>Add user</Button>
                    </>} />
                <FilterTabs label="User filter" value={filter} onChange={setFilter} tabs={[
                    { key: 'all', label: 'All', count: users.length },
                    { key: 'guests', label: 'Guests', count: users.filter(u => u.role === 'guest').length },
                    { key: 'staff', label: 'Staff', count: users.filter(u => u.role !== 'guest').length },
                ]} />
                <DataTable columns={columns} rows={rows} rowKey={u => u._id} loading={loading} onRowClick={setProfile}
                    searchText={u => `${u.name} ${u.email} ${u.phone || ''} ${u.userId || ''} ${u.role}`} searchPlaceholder="Name, email, phone"
                    exportName={`users-${filter}`} initialSort={{ key: 'createdAt', dir: 'desc' }} />
            </div>

            <Modal open={!!profile} onClose={() => setProfile(null)} size="lg" title={profile?.name} description={profile ? `${profile.email}${profile.phone ? ` · ${profile.phone}` : ''}` : undefined}
                footer={profile && <div className="flex w-full justify-between gap-2">
                    {profile._id !== me?.id ? <Button size="sm" variant="ghost" leftIcon={<BsTrash />} onClick={() => remove(profile)}>Delete</Button> : <span />}
                    <Button size="sm" leftIcon={<BsPencil />} onClick={() => { const u = profile; setProfile(null); startEdit(u); }}>Edit</Button>
                </div>}>
                {profile && (
                    <div className="space-y-5 text-sm">
                        <div className="flex flex-wrap gap-2"><Badge tone={ROLE_TONE[profile.role]}>{profile.role}</Badge>{profile.userId && <Badge>{profile.userId}</Badge>}</div>
                        <dl className="grid grid-cols-3 gap-4">
                            <div><dt className="text-xs uppercase tracking-[0.14em] text-taupe">Stays</dt><dd className="mt-1 font-display text-2xl">{p?.stays || 0}</dd></div>
                            <div><dt className="text-xs uppercase tracking-[0.14em] text-taupe">Paid</dt><dd className="mt-1 font-display text-2xl">{formatMoney(p?.spent || 0, currency)}</dd></div>
                            <div><dt className="text-xs uppercase tracking-[0.14em] text-taupe">Last stay</dt><dd className="mt-1 font-display text-2xl">{p?.last ? formatDate(p.last, { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}</dd></div>
                        </dl>
                        <div>
                            <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-taupe">Bookings</h3>
                            {!p?.list.length ? <p className="text-taupe">No bookings yet.</p> : (
                                <ul className="divide-y divide-stone rounded-xl border border-stone dark:divide-graphite dark:border-graphite">
                                    {[...p.list].sort((a, b) => b.checkInDate.localeCompare(a.checkInDate)).map(b => (
                                        <li key={b._id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                                            <div>
                                                <p className="font-semibold">{formatDate(b.checkInDate, { day: 'numeric', month: 'short', year: 'numeric' })} → {formatDate(b.checkOutDate, { day: 'numeric', month: 'short' })}</p>
                                                <p className="text-xs text-taupe">{b.confirmationCode} · {b.room?.type?.name} · {hotelOf(b)?.name}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge tone={statusTone(b.status)}>{statusLabel(b.status)}</Badge>
                                                <span className="tabular-nums">{formatMoney(b.totalPrice, b.pricing?.currency || currency)}</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add user' : `Edit ${editing && typeof editing === 'object' ? editing.name : ''}`}
                description={editing === 'new' ? 'Staff accounts can only be created here.' : undefined}
                footer={<><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save} loading={saving}>Save</Button></>}>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Input label="Full name" required value={form.name} onChange={set('name')} autoComplete="off" />
                    <Input label="Email" required type="email" value={form.email} onChange={set('email')} autoComplete="off" />
                    <Input label="Phone" value={form.phone} onChange={set('phone')} />
                    <Select label="Role" value={form.role} onChange={set('role')} hint={ROLE_HELP[form.role]}
                        disabled={editing !== 'new' && editing?._id === me?.id}>
                        <option value="guest">Guest</option>
                        <option value="receptionist">Receptionist</option>
                        <option value="housekeeping">Housekeeping</option>
                        <option value="admin">Admin</option>
                    </Select>
                    <Input label={editing === 'new' ? 'Password' : 'New password'} type="password" autoComplete="new-password" value={form.password} onChange={set('password')}
                        containerClassName="sm:col-span-2" hint={editing === 'new' ? 'At least 8 characters. Share it privately; they can change it in their profile.' : 'Leave empty to keep the current password'} />
                </div>
            </Modal>
        </AdminLayout>
    );
};

export default ManageUsers;
