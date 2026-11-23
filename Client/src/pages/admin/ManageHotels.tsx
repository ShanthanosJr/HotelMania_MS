import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BsArrowRepeat, BsPlusLg, BsPencil, BsTrash, BsBoxArrowUpRight } from 'react-icons/bs';
import AdminLayout from '../../components/AdminLayout';
import PageHeader from '../../components/admin/PageHeader';
import DataTable, { type Column } from '../../components/admin/DataTable';
import PhotoManager from '../../components/admin/PhotoManager';
import { appendPhotos, emptyPhotos, type PhotoChanges } from '../../components/admin/photos';
import { Button, Input, Modal, Textarea, confirmDialog, toast } from '../../components/ui';
import { apiJson, errorText, photoSrc } from '../../utils/adminApi';

interface Hotel {
    _id: string; name: string; address: string; description: string; rating?: number;
    amenities?: string[]; photos?: string[]; contactInfo?: { phone?: string; email?: string; website?: string };
}

const blank = { name: '', address: '', description: '', rating: '', amenities: '', phone: '', email: '', website: '' };

const ManageHotels: React.FC = () => {
    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [counts, setCounts] = useState<{ rooms: Record<string, number>; types: Record<string, number> }>({ rooms: {}, types: {} });
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<Hotel | 'new' | null>(null);
    const [form, setForm] = useState(blank);
    const [photos, setPhotos] = useState<PhotoChanges>(emptyPhotos());
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [h, rooms, types] = await Promise.all([
                apiJson<Hotel[]>('GET', '/api/hotels'),
                apiJson<{ hotel?: { _id: string } | string }[]>('GET', '/api/rooms'),
                apiJson<{ hotel?: { _id: string } | string }[]>('GET', '/api/room-types'),
            ]);
            const tally = (list: { hotel?: { _id: string } | string }[]) => list.reduce<Record<string, number>>((m, x) => {
                const id = typeof x.hotel === 'string' ? x.hotel : x.hotel?._id;
                if (id) m[id] = (m[id] || 0) + 1;
                return m;
            }, {});
            setHotels(h);
            setCounts({ rooms: tally(rooms), types: tally(types) });
        } catch (err) {
            toast.error(errorText(err, 'Could not load hotels'));
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { load(); }, [load]);

    const startNew = () => { setForm(blank); setPhotos(emptyPhotos()); setEditing('new'); };
    const startEdit = (h: Hotel) => {
        setForm({
            name: h.name, address: h.address, description: h.description, rating: h.rating ? String(h.rating) : '',
            amenities: (h.amenities || []).join(', '), phone: h.contactInfo?.phone || '', email: h.contactInfo?.email || '', website: h.contactInfo?.website || '',
        });
        setPhotos(emptyPhotos(h.photos || []));
        setEditing(h);
    };
    const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

    const save = async () => {
        if (!form.name.trim() || !form.address.trim() || !form.description.trim()) return toast.warning('Name, address and description are required.');
        setSaving(true);
        try {
            const fd = new FormData();
            fd.append('name', form.name.trim());
            fd.append('address', form.address.trim());
            fd.append('description', form.description.trim());
            if (form.rating) fd.append('rating', form.rating);
            fd.append('amenities', JSON.stringify(form.amenities.split(',').map(s => s.trim()).filter(Boolean)));
            fd.append('contactInfo', JSON.stringify({ phone: form.phone.trim(), email: form.email.trim(), website: form.website.trim() }));
            appendPhotos(fd, photos, editing !== 'new');
            if (editing === 'new') {
                const created = await apiJson<Hotel>('POST', '/api/hotels', fd);
                setHotels(list => [...list, created]);
                toast.success(`${created.name} added. Next, add its room types under Rooms.`);
            } else if (editing) {
                const updated = await apiJson<Hotel>('PUT', `/api/hotels/${editing._id}`, fd);
                setHotels(list => list.map(h => (h._id === updated._id ? updated : h)));
                toast.success('Hotel saved');
            }
            setEditing(null);
        } catch (err) {
            toast.error(errorText(err, 'Could not save the hotel'));
        } finally {
            setSaving(false);
        }
    };

    const remove = async (h: Hotel) => {
        if (!(await confirmDialog({ title: `Delete ${h.name}?`, message: 'Only hotels without rooms or room types can be deleted.', confirmLabel: 'Delete', tone: 'danger' }))) return;
        try {
            await apiJson('DELETE', `/api/hotels/${h._id}`);
            setHotels(list => list.filter(x => x._id !== h._id));
            toast.success('Hotel deleted');
        } catch (err) { toast.error(errorText(err)); }
    };

    const columns: Column<Hotel>[] = useMemo(() => [
        {
            key: 'name', header: 'Hotel', sortable: true,
            render: h => (
                <div className="flex items-center gap-3">
                    <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-stone dark:bg-graphite">
                        {h.photos?.[0] && <img src={photoSrc(h.photos[0])} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="min-w-0">
                        <p className="font-semibold">{h.name}</p>
                        <p className="truncate text-xs text-taupe dark:text-gray-400">{h.address}</p>
                    </div>
                </div>
            ),
        },
        { key: 'rating', header: 'Rating', sortable: true, value: h => h.rating || 0, render: h => (h.rating ? `★ ${h.rating}` : '—'), hideBelow: 'md' },
        { key: 'types', header: 'Room types', sortable: true, align: 'right', value: h => counts.types[h._id] || 0 },
        { key: 'rooms', header: 'Rooms', sortable: true, align: 'right', value: h => counts.rooms[h._id] || 0 },
        { key: 'photos', header: 'Photos', align: 'right', value: h => h.photos?.length || 0, hideBelow: 'md' },
        {
            key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right',
            render: h => (
                <div className="flex justify-end gap-1">
                    <Link to={`/hotel/${h._id}`} target="_blank" aria-label={`View ${h.name} on the website`} className="rounded-lg p-2 text-taupe hover:bg-linen hover:text-bronze dark:hover:bg-graphite"><BsBoxArrowUpRight /></Link>
                    <button type="button" aria-label={`Edit ${h.name}`} onClick={e => { e.stopPropagation(); startEdit(h); }} className="rounded-lg p-2 text-taupe hover:bg-linen hover:text-bronze dark:hover:bg-graphite cursor-pointer"><BsPencil /></button>
                    <button type="button" aria-label={`Delete ${h.name}`} onClick={e => { e.stopPropagation(); remove(h); }} className="rounded-lg p-2 text-taupe hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/30 cursor-pointer"><BsTrash /></button>
                </div>
            ),
        },
    ], [counts]);

    return (
        <AdminLayout>
            <div className="mx-auto max-w-7xl p-6 md:p-10">
                <PageHeader title="Hotels" subtitle="Properties shown on the website. Each hotel has room types, and each type has rooms."
                    actions={<>
                        <Button variant="secondary" size="sm" leftIcon={<BsArrowRepeat />} onClick={load} loading={loading}>Refresh</Button>
                        <Button size="sm" leftIcon={<BsPlusLg />} onClick={startNew}>Add hotel</Button>
                    </>} />
                <DataTable columns={columns} rows={hotels} rowKey={h => h._id} loading={loading} onRowClick={startEdit}
                    searchText={h => `${h.name} ${h.address}`} exportName="hotels" emptyTitle="No hotels yet" emptyText="Add your first hotel to start selling rooms." />
            </div>

            <Modal open={!!editing} onClose={() => setEditing(null)} size="lg" title={editing === 'new' ? 'Add hotel' : 'Edit hotel'}
                footer={<><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save} loading={saving}>Save</Button></>}>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Input label="Name" required value={form.name} onChange={set('name')} />
                    <Input label="Guest rating (0–5)" type="number" min={0} max={5} step="0.1" value={form.rating} onChange={set('rating')} hint="Shown on the website" />
                    <Input label="Address" required value={form.address} onChange={set('address')} containerClassName="sm:col-span-2" />
                    <Textarea label="Description" required rows={4} value={form.description} onChange={set('description')} containerClassName="sm:col-span-2" />
                    <Input label="Amenities" value={form.amenities} onChange={set('amenities')} containerClassName="sm:col-span-2" hint="Separate with commas, e.g. Pool, Spa, Free Wi-Fi" />
                    <Input label="Phone" value={form.phone} onChange={set('phone')} />
                    <Input label="Email" type="email" value={form.email} onChange={set('email')} />
                    <Input label="Website" type="url" value={form.website} onChange={set('website')} containerClassName="sm:col-span-2" />
                    <div className="sm:col-span-2">
                        <PhotoManager existing={editing && editing !== 'new' ? editing.photos || [] : []} value={photos} onChange={setPhotos} />
                    </div>
                </div>
            </Modal>
        </AdminLayout>
    );
};

export default ManageHotels;
