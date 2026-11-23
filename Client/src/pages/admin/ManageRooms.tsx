import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BsArrowRepeat, BsPlusLg, BsPencil, BsTrash, BsTag } from 'react-icons/bs';
import AdminLayout from '../../components/AdminLayout';
import PageHeader from '../../components/admin/PageHeader';
import DataTable, { type Column } from '../../components/admin/DataTable';
import FilterTabs from '../../components/admin/FilterTabs';
import PhotoManager from '../../components/admin/PhotoManager';
import { appendPhotos, emptyPhotos, type PhotoChanges } from '../../components/admin/photos';
import { Badge, Button, Input, Modal, Select, Textarea, confirmDialog, statusTone, toast } from '../../components/ui';
import { apiJson, errorText, photoSrc } from '../../utils/adminApi';
import { formatMoney, statusLabel } from '../../utils/booking';
import { usePricing } from '../../hooks/usePublicData';

interface HotelLite { _id: string; name: string }
interface RoomType {
    _id: string; name: string; hotel?: HotelLite; basePrice: number; maxOccupancy: number; description: string;
    amenities?: string[]; photos?: string[]; size?: number; bedType?: string; view?: string;
}
interface Room { _id: string; roomNumber: string; status: string; hotel?: HotelLite; type?: { _id: string; name: string } }

const typeBlank = { name: '', hotel: '', basePrice: '', maxOccupancy: '2', size: '', bedType: '', view: '', description: '', amenities: '' };
const roomStatusLabel = (s: string) => (s === 'available' ? 'Clean' : s === 'maintenance' ? 'Out of order' : statusLabel(s));

/** "101, 102, 110-112" → ["101","102","110","111","112"] (ranges up to 100 rooms). */
const expandNumbers = (input: string) => {
    const out: string[] = [];
    for (const part of input.split(/[,\s]+/).filter(Boolean)) {
        const m = part.match(/^(\d+)-(\d+)$/);
        if (m && Number(m[2]) >= Number(m[1]) && Number(m[2]) - Number(m[1]) < 100) {
            for (let n = Number(m[1]); n <= Number(m[2]); n++) out.push(String(n).padStart(m[1].length, '0'));
        } else out.push(part);
    }
    return [...new Set(out)];
};

const ManageRooms: React.FC = () => {
    const [params, setParams] = useSearchParams();
    const tab = params.get('tab') === 'rooms' ? 'rooms' : 'types';
    const { currency } = usePricing();
    const [hotels, setHotels] = useState<HotelLite[]>([]);
    const [types, setTypes] = useState<RoomType[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [hotelFilter, setHotelFilter] = useState('');
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [h, t, r] = await Promise.all([
                apiJson<HotelLite[]>('GET', '/api/hotels'),
                apiJson<RoomType[]>('GET', '/api/room-types'),
                apiJson<Room[]>('GET', '/api/rooms'),
            ]);
            setHotels(h); setTypes(t); setRooms(r);
        } catch (err) {
            toast.error(errorText(err, 'Could not load rooms'));
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { load(); }, [load]);

    const roomsPerType = useMemo(() => rooms.reduce<Record<string, number>>((m, r) => { if (r.type) m[r.type._id] = (m[r.type._id] || 0) + 1; return m; }, {}), [rooms]);
    const shownTypes = types.filter(t => !hotelFilter || t.hotel?._id === hotelFilter);
    const shownRooms = rooms.filter(r => !hotelFilter || r.hotel?._id === hotelFilter);

    /* ---------- Room types ---------- */
    const [editingType, setEditingType] = useState<RoomType | 'new' | null>(null);
    const [typeForm, setTypeForm] = useState(typeBlank);
    const [photos, setPhotos] = useState<PhotoChanges>(emptyPhotos());
    const setT = (k: keyof typeof typeBlank) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setTypeForm(f => ({ ...f, [k]: e.target.value }));

    const newType = () => { setTypeForm({ ...typeBlank, hotel: hotelFilter || hotels[0]?._id || '' }); setPhotos(emptyPhotos()); setEditingType('new'); };
    const editType = (t: RoomType) => {
        setTypeForm({
            name: t.name, hotel: t.hotel?._id || '', basePrice: String(t.basePrice), maxOccupancy: String(t.maxOccupancy),
            size: t.size ? String(t.size) : '', bedType: t.bedType || '', view: t.view || '', description: t.description, amenities: (t.amenities || []).join(', '),
        });
        setPhotos(emptyPhotos(t.photos || []));
        setEditingType(t);
    };
    const saveType = async () => {
        if (!typeForm.name.trim() || !typeForm.hotel || !typeForm.basePrice || !typeForm.description.trim()) return toast.warning('Name, hotel, price and description are required.');
        setSaving(true);
        try {
            const fd = new FormData();
            (['name', 'hotel', 'basePrice', 'maxOccupancy', 'size', 'bedType', 'view', 'description'] as const).forEach(k => {
                if (typeForm[k] !== '' || editingType !== 'new') fd.append(k, typeForm[k].trim());
            });
            fd.append('amenities', JSON.stringify(typeForm.amenities.split(',').map(s => s.trim()).filter(Boolean)));
            appendPhotos(fd, photos, editingType !== 'new');
            if (editingType === 'new') {
                const created = await apiJson<RoomType>('POST', '/api/room-types', fd);
                setTypes(list => [...list, created]);
                toast.success(`${created.name} added. Now add its rooms.`);
            } else if (editingType) {
                const updated = await apiJson<RoomType>('PUT', `/api/room-types/${editingType._id}`, fd);
                setTypes(list => list.map(t => (t._id === updated._id ? updated : t)));
                toast.success('Room type saved');
            }
            setEditingType(null);
        } catch (err) {
            toast.error(errorText(err, 'Could not save the room type'));
        } finally {
            setSaving(false);
        }
    };
    const removeType = async (t: RoomType) => {
        if (!(await confirmDialog({ title: `Delete ${t.name}?`, message: 'Only room types with no rooms can be deleted.', confirmLabel: 'Delete', tone: 'danger' }))) return;
        try {
            await apiJson('DELETE', `/api/room-types/${t._id}`);
            setTypes(list => list.filter(x => x._id !== t._id));
            toast.success('Room type deleted');
        } catch (err) { toast.error(errorText(err)); }
    };

    /* ---------- Rooms ---------- */
    const [addingRooms, setAddingRooms] = useState(false);
    const [roomForm, setRoomForm] = useState({ hotel: '', type: '', numbers: '' });
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);
    const [roomEdit, setRoomEdit] = useState({ roomNumber: '', type: '', status: 'available' });

    const addRooms = async () => {
        const numbers = expandNumbers(roomForm.numbers);
        if (!roomForm.hotel || !roomForm.type || !numbers.length) return toast.warning('Choose a hotel, a room type and at least one room number.');
        setSaving(true);
        const failed: string[] = [];
        const created: Room[] = [];
        for (const n of numbers) {
            try {
                created.push(await apiJson<Room>('POST', '/api/rooms', { roomNumber: n, hotel: roomForm.hotel, type: roomForm.type }));
            } catch (err) {
                failed.push(`${n} (${errorText(err)})`);
            }
        }
        setRooms(list => [...list, ...created]);
        setSaving(false);
        if (created.length) toast.success(`Added ${created.length} room${created.length === 1 ? '' : 's'}`);
        if (failed.length) toast.error(`Not added: ${failed.join(', ')}`);
        else setAddingRooms(false);
    };
    const editRoom = (r: Room) => { setRoomEdit({ roomNumber: r.roomNumber, type: r.type?._id || '', status: r.status }); setEditingRoom(r); };
    const saveRoom = async () => {
        if (!editingRoom) return;
        setSaving(true);
        try {
            const payload: Record<string, string> = { roomNumber: roomEdit.roomNumber.trim(), type: roomEdit.type };
            if (editingRoom.status !== 'occupied') payload.status = roomEdit.status;
            const updated = await apiJson<Room>('PUT', `/api/rooms/${editingRoom._id}`, payload);
            setRooms(list => list.map(r => (r._id === updated._id ? updated : r)));
            setEditingRoom(null);
            toast.success('Room saved');
        } catch (err) { toast.error(errorText(err)); } finally { setSaving(false); }
    };
    const removeRoom = async (r: Room) => {
        if (!(await confirmDialog({ title: `Delete room ${r.roomNumber}?`, message: 'Rooms with current or upcoming bookings cannot be deleted.', confirmLabel: 'Delete', tone: 'danger' }))) return;
        try {
            await apiJson('DELETE', `/api/rooms/${r._id}`);
            setRooms(list => list.filter(x => x._id !== r._id));
            toast.success('Room deleted');
        } catch (err) { toast.error(errorText(err)); }
    };

    const iconBtn = 'rounded-lg p-2 text-taupe hover:bg-linen hover:text-bronze dark:hover:bg-graphite cursor-pointer';
    const typeColumns: Column<RoomType>[] = [
        {
            key: 'name', header: 'Room type', sortable: true,
            render: t => (
                <div className="flex items-center gap-3">
                    <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-stone dark:bg-graphite">{t.photos?.[0] && <img src={photoSrc(t.photos[0])} alt="" className="h-full w-full object-cover" />}</div>
                    <div><p className="font-semibold">{t.name}</p><p className="text-xs text-taupe dark:text-gray-400">{[t.size ? `${t.size} m²` : '', t.bedType, t.view].filter(Boolean).join(' · ') || '—'}</p></div>
                </div>
            ),
        },
        { key: 'hotel', header: 'Hotel', sortable: true, value: t => t.hotel?.name, hideBelow: 'md' },
        { key: 'basePrice', header: 'Base price', sortable: true, align: 'right', render: t => <span className="tabular-nums">{formatMoney(t.basePrice, currency)}</span> },
        { key: 'maxOccupancy', header: 'Sleeps', sortable: true, align: 'right' },
        { key: 'rooms', header: 'Rooms', sortable: true, align: 'right', value: t => roomsPerType[t._id] || 0 },
        {
            key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right',
            render: t => (
                <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                    <Link to="/admin/rates" aria-label={`Rates for ${t.name}`} title="Rate calendar" className={iconBtn}><BsTag /></Link>
                    <button type="button" aria-label={`Edit ${t.name}`} onClick={() => editType(t)} className={iconBtn}><BsPencil /></button>
                    <button type="button" aria-label={`Delete ${t.name}`} onClick={() => removeType(t)} className={`${iconBtn} hover:!text-red-700`}><BsTrash /></button>
                </div>
            ),
        },
    ];
    const roomColumns: Column<Room>[] = [
        { key: 'roomNumber', header: 'Room', sortable: true, render: r => <span className="font-display text-lg font-semibold">{r.roomNumber}</span> },
        { key: 'type', header: 'Type', sortable: true, value: r => r.type?.name },
        { key: 'hotel', header: 'Hotel', sortable: true, value: r => r.hotel?.name, hideBelow: 'md' },
        { key: 'status', header: 'Status', sortable: true, render: r => <Badge tone={statusTone(r.status)}>{roomStatusLabel(r.status)}</Badge> },
        {
            key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right',
            render: r => (
                <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                    <button type="button" aria-label={`Edit room ${r.roomNumber}`} onClick={() => editRoom(r)} className={iconBtn}><BsPencil /></button>
                    <button type="button" aria-label={`Delete room ${r.roomNumber}`} onClick={() => removeRoom(r)} className={`${iconBtn} hover:!text-red-700`}><BsTrash /></button>
                </div>
            ),
        },
    ];

    const typesForHotel = (hotelId: string) => types.filter(t => t.hotel?._id === hotelId);

    return (
        <AdminLayout>
            <div className="mx-auto max-w-7xl p-6 md:p-10">
                <PageHeader title="Rooms" subtitle="Room types are what guests book (price, photos, description). Rooms are the physical rooms the system assigns."
                    actions={<>
                        {hotels.length > 1 && (
                            <select aria-label="Hotel" value={hotelFilter} onChange={e => setHotelFilter(e.target.value)}
                                className="rounded-lg border border-stone bg-white px-3 py-2 text-sm dark:border-graphite dark:bg-charcoal dark:text-cream cursor-pointer">
                                <option value="">All hotels</option>
                                {hotels.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
                            </select>
                        )}
                        <Button variant="secondary" size="sm" leftIcon={<BsArrowRepeat />} onClick={load} loading={loading}>Refresh</Button>
                        {tab === 'types'
                            ? <Button size="sm" leftIcon={<BsPlusLg />} onClick={newType} disabled={!hotels.length}>Add room type</Button>
                            : <Button size="sm" leftIcon={<BsPlusLg />} disabled={!types.length} onClick={() => { const h = hotelFilter || hotels[0]?._id || ''; setRoomForm({ hotel: h, type: typesForHotel(h)[0]?._id || '', numbers: '' }); setAddingRooms(true); }}>Add rooms</Button>}
                    </>} />
                <FilterTabs label="Rooms view" value={tab} onChange={k => setParams({ tab: k }, { replace: true })}
                    tabs={[{ key: 'types', label: 'Room types', count: shownTypes.length }, { key: 'rooms', label: 'Rooms', count: shownRooms.length }]} />
                {tab === 'types' ? (
                    <DataTable columns={typeColumns} rows={shownTypes} rowKey={t => t._id} loading={loading} onRowClick={editType}
                        searchText={t => `${t.name} ${t.hotel?.name} ${t.bedType} ${t.view}`} exportName="room-types"
                        emptyTitle="No room types yet" emptyText={hotels.length ? 'Add a room type, then its rooms.' : 'Add a hotel first.'} />
                ) : (
                    <DataTable columns={roomColumns} rows={shownRooms} rowKey={r => r._id} loading={loading} onRowClick={editRoom}
                        searchText={r => `${r.roomNumber} ${r.type?.name} ${r.hotel?.name} ${r.status}`} exportName="rooms"
                        initialSort={{ key: 'roomNumber', dir: 'asc' }} pageSize={50} emptyTitle="No rooms yet" />
                )}
            </div>

            <Modal open={!!editingType} onClose={() => setEditingType(null)} size="lg" title={editingType === 'new' ? 'Add room type' : 'Edit room type'}
                footer={<><Button variant="ghost" onClick={() => setEditingType(null)}>Cancel</Button><Button onClick={saveType} loading={saving}>Save</Button></>}>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Input label="Name" required value={typeForm.name} onChange={setT('name')} placeholder="e.g. Deluxe Ocean View" />
                    <Select label="Hotel" required value={typeForm.hotel} onChange={setT('hotel')} disabled={editingType !== 'new'}
                        hint={editingType !== 'new' ? 'A room type stays with its hotel' : undefined}>
                        {hotels.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
                    </Select>
                    <Input label={`Base price per night (${currency})`} required type="number" min={0} step="0.01" value={typeForm.basePrice} onChange={setT('basePrice')} hint="Change single dates in the rate calendar" />
                    <Input label="Sleeps (max guests)" required type="number" min={1} max={20} value={typeForm.maxOccupancy} onChange={setT('maxOccupancy')} />
                    <Input label="Size (m²)" type="number" min={0} value={typeForm.size} onChange={setT('size')} />
                    <Input label="Bed" value={typeForm.bedType} onChange={setT('bedType')} placeholder="King bed" />
                    <Input label="View" value={typeForm.view} onChange={setT('view')} placeholder="Ocean" containerClassName="sm:col-span-2" />
                    <Textarea label="Description" required rows={4} value={typeForm.description} onChange={setT('description')} containerClassName="sm:col-span-2" />
                    <Input label="Amenities" value={typeForm.amenities} onChange={setT('amenities')} containerClassName="sm:col-span-2" hint="Separate with commas, e.g. Rain shower, Minibar, Balcony" />
                    <div className="sm:col-span-2"><PhotoManager existing={editingType && editingType !== 'new' ? editingType.photos || [] : []} value={photos} onChange={setPhotos} /></div>
                </div>
            </Modal>

            <Modal open={addingRooms} onClose={() => setAddingRooms(false)} title="Add rooms"
                footer={<><Button variant="ghost" onClick={() => setAddingRooms(false)}>Cancel</Button><Button onClick={addRooms} loading={saving}>Add {expandNumbers(roomForm.numbers).length || ''} room{expandNumbers(roomForm.numbers).length === 1 ? '' : 's'}</Button></>}>
                <div className="grid gap-4">
                    <Select label="Hotel" value={roomForm.hotel} onChange={e => setRoomForm({ hotel: e.target.value, type: typesForHotel(e.target.value)[0]?._id || '', numbers: roomForm.numbers })}>
                        {hotels.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
                    </Select>
                    <Select label="Room type" value={roomForm.type} onChange={e => setRoomForm(f => ({ ...f, type: e.target.value }))}>
                        {typesForHotel(roomForm.hotel).length === 0 && <option value="">This hotel has no room types yet</option>}
                        {typesForHotel(roomForm.hotel).map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                    </Select>
                    <Input label="Room numbers" value={roomForm.numbers} onChange={e => setRoomForm(f => ({ ...f, numbers: e.target.value }))}
                        placeholder="101, 102, 110-115" hint="Separate with commas. Use a dash for a range." />
                </div>
            </Modal>

            <Modal open={!!editingRoom} onClose={() => setEditingRoom(null)} title={editingRoom ? `Room ${editingRoom.roomNumber}` : ''} description={editingRoom?.hotel?.name}
                footer={<><Button variant="ghost" onClick={() => setEditingRoom(null)}>Cancel</Button><Button onClick={saveRoom} loading={saving}>Save</Button></>}>
                {editingRoom && (
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input label="Room number" value={roomEdit.roomNumber} onChange={e => setRoomEdit(f => ({ ...f, roomNumber: e.target.value }))} />
                        <Select label="Room type" value={roomEdit.type} onChange={e => setRoomEdit(f => ({ ...f, type: e.target.value }))}>
                            {typesForHotel(editingRoom.hotel?._id || '').map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                        </Select>
                        {editingRoom.status === 'occupied' ? (
                            <p className="text-sm text-taupe sm:col-span-2">A guest is checked in. Status changes after check-out.</p>
                        ) : (
                            <Select label="Status" value={roomEdit.status} onChange={e => setRoomEdit(f => ({ ...f, status: e.target.value }))} containerClassName="sm:col-span-2">
                                <option value="available">Clean (ready to sell)</option>
                                <option value="dirty">Dirty</option>
                                <option value="maintenance">Out of order (not sold online)</option>
                            </Select>
                        )}
                    </div>
                )}
            </Modal>
        </AdminLayout>
    );
};

export default ManageRooms;
