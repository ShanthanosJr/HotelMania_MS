import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../utils/api';
import AdminLayout from '../../components/AdminLayout';
import {
  BsHouseDoor,
  BsTags,
  BsPlusCircle,
  BsArrowLeft,
  BsSearch,
  BsGrid,
  BsList,
  BsPencil,
  BsTrash,
  BsX,
  BsCheckCircle,
  BsPieChart,
  BsGraphUp,
  BsExclamationTriangle,
  BsChevronLeft,
  BsChevronRight,
  BsCurrencyDollar,
  BsPeople,
  BsInfoCircle,
  BsImages,
  BsWifi,
  BsCloudUpload,
  BsFileText
} from 'react-icons/bs';
import {
  BarChart,
  Bar,
  XAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

type RoomStatus = 'available' | 'occupied' | 'maintenance' | string;

interface Hotel {
  _id: string;
  name: string;
}

interface RoomType {
  _id: string;
  name: string;
  hotel?: Hotel | string;
  basePrice: number;
  maxOccupancy: number;
  description?: string;
  amenities?: string[];
  photos?: string[];
}

interface Room {
  _id: string;
  roomNumber: string | number;
  hotel?: Hotel | string;
  type?: RoomType | string;
  status: RoomStatus;
}

interface PriceRangeFilter {
  min: string;
  max: string;
}

interface RoomFormState {
  roomNumber: string;
  hotel: string;
  type: string;
  status: RoomStatus;
}

interface TypeFormState {
  name: string;
  hotel: string;
  basePrice: number;
  maxOccupancy: number;
  description: string;
  amenities: string;
  photos: string;
  files: File[];
}

type ActiveTab = 'rooms' | 'types';
type ViewMode = 'grid' | 'table';

const ITEMS_PER_PAGE = 6;

const ManageRooms: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('rooms');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [roomStatusFilter, setRoomStatusFilter] = useState<RoomStatus | 'all'>('all');
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>('all');
  const [hotelFilter, setHotelFilter] = useState<string>('all');
  const [priceRangeFilter, setPriceRangeFilter] = useState<PriceRangeFilter>({ min: '', max: '' });
  const [occupancyFilter, setOccupancyFilter] = useState<string>('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<'general' | 'details' | 'amenities' | 'media'>('general');

  const [roomForm, setRoomForm] = useState<RoomFormState>({
    roomNumber: '',
    hotel: '',
    type: '',
    status: 'available',
  });

  const [typeForm, setTypeForm] = useState<TypeFormState>({
    name: '',
    hotel: '',
    basePrice: 0,
    maxOccupancy: 1,
    description: '',
    amenities: '',
    photos: '',
    files: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  // Reset pagination when tab or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, roomStatusFilter, roomTypeFilter, hotelFilter, priceRangeFilter, occupancyFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rRes, tRes, hRes] = await Promise.all([
        api.get('/api/rooms'),
        api.get('/api/room-types'),
        api.get('/api/hotels'),
      ]);

      const rData = await rRes.json();
      const tData = await tRes.json();
      const hData = await hRes.json();

      if (rData.success && Array.isArray(rData.data)) setRooms(rData.data);
      if (tData.success && Array.isArray(tData.data)) setRoomTypes(tData.data);
      if (hData.success && Array.isArray(hData.data)) setHotels(hData.data);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Metrics
  const roomMetrics = useMemo(() => {
    const total = rooms.length;
    const available = rooms.filter(r => r.status === 'available').length;
    const occupied = rooms.filter(r => r.status === 'occupied').length;
    const maintenance = rooms.filter(r => r.status === 'maintenance').length;

    const statusData = [
      { name: 'Available', value: available, color: '#81C784' },
      { name: 'Occupied', value: occupied, color: '#78909C' },
      { name: 'Maintenance', value: maintenance, color: '#E57373' },
    ];

    return { total, available, occupied, maintenance, statusData };
  }, [rooms]);

  const typeMetrics = useMemo(() => {
    const total = roomTypes.length;
    const avgPrice =
      total > 0
        ? roomTypes.reduce((acc, curr) => acc + (curr.basePrice || 0), 0) / total
        : 0;

    const prices = roomTypes.map(t => t.basePrice || 0);
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;

    const priceData = roomTypes.map(t => ({
      name: t.name,
      price: t.basePrice,
    }));

    return { total, avgPrice, minPrice, maxPrice, priceData };
  }, [roomTypes]);

  // Filtering Logic
  const filteredItems = useMemo(() => {
    if (activeTab === 'rooms') {
      return rooms.filter(room => {
        const matchesSearch = String(room.roomNumber).toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = roomStatusFilter === 'all' || room.status === roomStatusFilter;

        const hotelId = typeof room.hotel === 'string' ? room.hotel : room.hotel?._id;
        const matchesHotel = hotelFilter === 'all' || hotelId === hotelFilter;

        const typeId = typeof room.type === 'string' ? room.type : room.type?._id;
        const matchesType = roomTypeFilter === 'all' || typeId === roomTypeFilter;

        return matchesSearch && matchesStatus && matchesHotel && matchesType;
      });
    } else {
      return roomTypes.filter(type => {
        const matchesSearch = type.name.toLowerCase().includes(searchTerm.toLowerCase());

        const hotelId = typeof type.hotel === 'string' ? type.hotel : type.hotel?._id;
        const matchesHotel = hotelFilter === 'all' || hotelId === hotelFilter;

        const matchesPrice =
          (priceRangeFilter.min === '' || type.basePrice >= parseFloat(priceRangeFilter.min)) &&
          (priceRangeFilter.max === '' || type.basePrice <= parseFloat(priceRangeFilter.max));

        const matchesOccupancy =
          occupancyFilter === '' || type.maxOccupancy >= parseInt(occupancyFilter, 10);

        return matchesSearch && matchesHotel && matchesPrice && matchesOccupancy;
      });
    }
  }, [activeTab, rooms, roomTypes, searchTerm, roomStatusFilter, roomTypeFilter, hotelFilter, priceRangeFilter, occupancyFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const resetFilters = () => {
    setSearchTerm('');
    setRoomStatusFilter('all');
    setRoomTypeFilter('all');
    setHotelFilter('all');
    setPriceRangeFilter({ min: '', max: '' });
    setOccupancyFilter('');
    setCurrentPage(1);
  };

  const openModal = (item?: Room | RoomType | null) => {
    const hasItem = !!item;
    setIsEditing(hasItem);

    if (hasItem && item) {
      setEditId((item as any)._id);
      if (activeTab === 'rooms') {
        const room = item as Room;
        setRoomForm({
          roomNumber: String(room.roomNumber ?? ''),
          hotel: (typeof room.hotel === 'string' ? room.hotel : room.hotel?._id) || '',
          type: (typeof room.type === 'string' ? room.type : room.type?._id) || '',
          status: room.status,
        });
      } else {
        const type = item as RoomType;
        setTypeForm({
          name: type.name || '',
          hotel: (typeof type.hotel === 'string' ? type.hotel : type.hotel?._id) || '',
          basePrice: type.basePrice || 0,
          maxOccupancy: type.maxOccupancy || 1,
          description: type.description || '',
          amenities: (type.amenities || []).join(', '),
          photos: (type.photos || []).join(', '),
          files: []
        });
      }
    } else {
      setEditId(null);
      setRoomForm({
        roomNumber: 'Generating...',
        hotel: '',
        type: '',
        status: 'available',
      });
      setTypeForm({
        name: '',
        hotel: '',
        basePrice: 0,
        maxOccupancy: 1,
        description: '',
        amenities: '',
        photos: '',
        files: []
      });
    }
    setModalTab('general');
    setShowModal(true);
  };

  // Auto-generate Room Number
  useEffect(() => {
    if (!showModal || isEditing || activeTab !== 'rooms') return;

    if (!roomForm.hotel || !roomForm.type) {
      setRoomForm(prev => ({ ...prev, roomNumber: 'Select Hotel & Type' }));
      return;
    }

    const generateNumber = () => {
      // 1. Get all rooms for this hotel
      const hotelRooms = rooms.filter(r => {
        const rHotelId = typeof r.hotel === 'string' ? r.hotel : r.hotel?._id;
        return rHotelId === roomForm.hotel;
      });

      // 2. Get rooms for this SPECIFIC type to find the sequence
      const typeRooms = hotelRooms.filter(r => {
        const rTypeId = typeof r.type === 'string' ? r.type : r.type?._id;
        return rTypeId === roomForm.type;
      });

      // 3. Find max number in this type to continue sequence
      let maxNum = 0;
      if (typeRooms.length > 0) {
        const nums = typeRooms.map(r => parseInt(String(r.roomNumber).replace(/\D/g, '')) || 0);
        maxNum = Math.max(...nums);
      } else {
        // If no rooms of this type, find max in hotel to avoid collision, or start at 101?
        // Let's look for a gap or just append to hotel total if we want to be safe.
        // BUT user asked for "related to hotel and room type".
        // Strategy: Start at 101 if empty, or try to be smart?
        // Safest: Max of HOTEL if type is new might be messy (e.g. 101..105 existing. New type -> 106).
        // Let's try to infer a range? No, too hard.
        // Fallback: If typeRooms is empty, check if we can start at 101.
        // If 101 exists in hotel, try 201?
        // Let's just do: Max of Hotel + 1 if no type matches.
        if (hotelRooms.length > 0) {
          const allNums = hotelRooms.map(r => parseInt(String(r.roomNumber).replace(/\D/g, '')) || 0);
          maxNum = Math.max(...allNums);
        } else {
          maxNum = 100; // Start at 101 for empty hotel
        }
      }

      let candidate = maxNum + 1;

      // 4. Ensure uniqueness in HOTEL (regardless of type) to be safe
      // (Unless same room number is allowed for different types? Unlikely for physical rooms)
      while (hotelRooms.some(r => {
        const rNum = parseInt(String(r.roomNumber).replace(/\D/g, '')) || 0;
        return rNum === candidate;
      })) {
        candidate++;
      }

      setRoomForm(prev => ({ ...prev, roomNumber: String(candidate) }));
    };

    generateNumber();
  }, [roomForm.hotel, roomForm.type, showModal, isEditing, rooms, activeTab]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Confirm deletion?')) return;
    const endpoint = activeTab === 'rooms' ? `/api/rooms/${id}` : `/api/room-types/${id}`;
    await api.delete(endpoint);
    fetchData();
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async e => {
    e.preventDefault();

    const endpoint = activeTab === 'rooms'
      ? (isEditing ? `/api/rooms/${editId}` : '/api/rooms')
      : (isEditing ? `/api/room-types/${editId}` : '/api/room-types');

    const method = isEditing ? 'put' : 'post';

    let payload: any;

    if (activeTab === 'rooms') {
      payload = roomForm;
    } else {
      // Create FormData for Room Types
      const formData = new FormData();
      formData.append('name', typeForm.name);
      formData.append('hotel', typeForm.hotel);
      formData.append('basePrice', String(typeForm.basePrice));
      formData.append('maxOccupancy', String(typeForm.maxOccupancy));
      formData.append('description', typeForm.description);
      formData.append('amenities', typeForm.amenities);

      // We don't append 'photos' string anymore, as we are uploading files.
      // But if we wanted to support editing existing photos via text we could.
      // However, the prompt says "change it to accept images".
      // We'll prioritize the file upload.

      if (typeForm.files) {
        typeForm.files.forEach(file => {
          formData.append('photos', file);
        });
      }

      payload = formData;
    }

    const res = await (api as any)[method](endpoint, payload);
    if (res.ok) {
      setShowModal(false);
      fetchData();
    }
  };

  const renderPagination = () => (
    <div className="flex items-center justify-between border-t border-[#E6E2D3] pt-4 mt-6">
      <div className="text-sm text-gray-500">
        Page <span className="font-semibold text-[#5D4037]">{currentPage}</span> of{' '}
        <span className="font-semibold text-[#5D4037]">{Math.max(1, totalPages)}</span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-[#E6E2D3] text-[#5D4037] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F9F7F2] transition-colors cursor-pointer"
        >
          <BsChevronLeft />
        </button>
        <button
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          disabled={currentPage >= totalPages}
          className="p-2 rounded-lg border border-[#E6E2D3] text-[#5D4037] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F9F7F2] transition-colors cursor-pointer"
        >
          <BsChevronRight />
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F7F2] flex items-center justify-center text-[#5D4037] font-serif text-xl">
        Loading HotelMania Inventory...
      </div>
    );
  }

  return (
    <AdminLayout>
      {/* HERO */}
      <div className="relative bg-gradient-to-r from-[#5D4037] to-[#8D6E63] text-[#F9F7F2] px-8 py-10 shadow-lg mb-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-16 -mt-16 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6 max-w-7xl mx-auto">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-inner">
                {activeTab === 'rooms' ? <BsHouseDoor className="text-3xl text-[#E6E2D3]" /> : <BsTags className="text-3xl text-[#E6E2D3]" />}
              </div>
              <h1 className="text-4xl font-serif font-bold tracking-tight">
                {activeTab === 'rooms' ? 'Room Management' : 'Room Types'}
              </h1>
            </div>
            <p className="text-[#E6E2D3] text-lg font-light max-w-xl">
              {activeTab === 'rooms'
                ? 'Manage availability, status, and assignments.'
                : 'Define pricing, amenities, and occupancy limits.'}
            </p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 rounded-full transition-all duration-300 font-semibold cursor-pointer"
            >
              <BsArrowLeft /> Back
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-12">
        {/* TAB NAV */}
        <div className="flex gap-4 mb-8 border-b border-[#E6E2D3]">
          <button
            onClick={() => setActiveTab('rooms')}
            className={`pb-4 px-4 font-bold text-lg transition-colors relative cursor-pointer ${activeTab === 'rooms'
              ? 'text-[#5D4037] border-b-4 border-[#5D4037]'
              : 'text-gray-400 hover:text-[#5D4037]'
              }`}
          >
            Rooms
          </button>
          <button
            onClick={() => setActiveTab('types')}
            className={`pb-4 px-4 font-bold text-lg transition-colors relative cursor-pointer ${activeTab === 'types'
              ? 'text-[#5D4037] border-b-4 border-[#5D4037]'
              : 'text-gray-400 hover:text-[#5D4037]'
              }`}
          >
            Room Types
          </button>
        </div>

        {/* CONTENT AREA */}
        {activeTab === 'rooms' ? (
          <div className="animate-fade-in">
            {/* ROOMS OVERVIEW */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Stats Cards */}
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E6E2D3] flex items-center gap-4">
                  <div className="p-4 rounded-full bg-blue-50 text-blue-600">
                    <BsHouseDoor size={24} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold">Total Rooms</p>
                    <h3 className="text-2xl font-serif font-bold text-[#5D4037]">{roomMetrics.total}</h3>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E6E2D3] flex items-center gap-4">
                  <div className="p-4 rounded-full bg-green-50 text-green-600">
                    <BsCheckCircle size={24} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold">Available</p>
                    <h3 className="text-2xl font-serif font-bold text-[#5D4037]">{roomMetrics.available}</h3>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E6E2D3] flex items-center gap-4">
                  <div className="p-4 rounded-full bg-gray-100 text-gray-600">
                    <BsPeople size={24} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold">Occupied</p>
                    <h3 className="text-2xl font-serif font-bold text-[#5D4037]">{roomMetrics.occupied}</h3>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E6E2D3] flex items-center gap-4">
                  <div className="p-4 rounded-full bg-red-50 text-red-600">
                    <BsExclamationTriangle size={24} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold">Maintenance</p>
                    <h3 className="text-2xl font-serif font-bold text-[#5D4037]">{roomMetrics.maintenance}</h3>
                  </div>
                </div>
              </div>

              {/* Pie Chart */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E6E2D3] flex flex-col justify-center items-center">
                <h4 className="text-sm font-bold text-[#5D4037] mb-2 self-start flex items-center gap-2">
                  <BsPieChart /> Status Distribution
                </h4>
                <div className="w-full h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={roomMetrics.statusData} innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                        {roomMetrics.statusData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* ROOMS CONTROLS */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#E6E2D3] mb-6 flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
              <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto">
                <div className="relative group w-full md:w-64">
                  <BsSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search room number..."
                    className="pl-10 pr-4 py-2 w-full bg-[#F9F7F2] border border-[#E6E2D3] rounded-xl focus:ring-2 focus:ring-[#8D6E63] outline-none"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  className="px-3 py-2 rounded-xl bg-[#F9F7F2] border border-[#E6E2D3] text-sm"
                  value={roomStatusFilter}
                  onChange={e => setRoomStatusFilter(e.target.value as RoomStatus | 'all')}
                >
                  <option value="all">Status: All</option>
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="maintenance">Maintenance</option>
                </select>
                <select
                  className="px-3 py-2 rounded-xl bg-[#F9F7F2] border border-[#E6E2D3] text-sm"
                  value={hotelFilter}
                  onChange={e => setHotelFilter(e.target.value)}
                >
                  <option value="all">Hotel: All</option>
                  {hotels.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
                </select>
                <select
                  className="px-3 py-2 rounded-xl bg-[#F9F7F2] border border-[#E6E2D3] text-sm"
                  value={roomTypeFilter}
                  onChange={e => setRoomTypeFilter(e.target.value)}
                >
                  <option value="all">Type: All</option>
                  {roomTypes.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#5D4037] border border-[#E6E2D3] rounded-xl hover:bg-[#F9F7F2] transition-colors cursor-pointer"
                >
                  Reset
                </button>
              </div>

              <div className="flex gap-3 w-full md:w-auto justify-between md:justify-end">
                <div className="flex bg-[#F9F7F2] p-1 rounded-lg">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md cursor-pointer ${viewMode === 'grid' ? 'bg-white shadow text-[#5D4037]' : 'text-gray-400'}`}
                  >
                    <BsGrid />
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-2 rounded-md cursor-pointer ${viewMode === 'table' ? 'bg-white shadow text-[#5D4037]' : 'text-gray-400'}`}
                  >
                    <BsList />
                  </button>
                </div>
                <button
                  onClick={() => openModal()}
                  className="flex items-center gap-2 px-5 py-2 bg-[#5D4037] text-white rounded-xl font-bold hover:bg-[#3E2723] transition-colors shadow-lg cursor-pointer"
                >
                  <BsPlusCircle /> Add Room
                </button>
              </div>
            </div>

            {/* ROOMS LIST */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedItems.map(item => {
                  const room = item as Room;
                  const hName = typeof room.hotel === 'string'
                    ? hotels.find(h => h._id === room.hotel)?.name
                    : (room.hotel as Hotel)?.name;
                  const tName = typeof room.type === 'string'
                    ? roomTypes.find(t => t._id === room.type)?.name
                    : (room.type as RoomType)?.name;

                  return (
                    <div key={room._id} className="bg-white rounded-2xl shadow-sm border border-[#E6E2D3] p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-serif font-bold text-[#5D4037]">Room {room.roomNumber}</h4>
                        <span className={`px-3 py-1 text-xs rounded-full font-semibold ${room.status === 'available' ? 'bg-green-50 text-green-700' :
                          room.status === 'occupied' ? 'bg-gray-100 text-gray-700' :
                            'bg-red-50 text-red-700'
                          }`}>
                          {room.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p className="flex items-center gap-2"><BsHouseDoor className="text-gray-400" /> {hName || 'Unknown Hotel'}</p>
                        <p className="flex items-center gap-2"><BsTags className="text-gray-400" /> {tName || 'Unknown Type'}</p>
                      </div>
                      <div className="flex gap-2 pt-3 border-t border-dashed border-[#E6E2D3] mt-auto">
                        <button onClick={() => openModal(room)} className="flex-1 py-2 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-semibold cursor-pointer">Edit</button>
                        <button onClick={() => handleDelete(room._id)} className="flex-1 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-semibold cursor-pointer">Delete</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-[#E6E2D3] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#F9F7F2] text-[#5D4037] font-serif">
                      <tr>
                        <th className="p-4 font-bold">Room #</th>
                        <th className="p-4 font-bold">Hotel</th>
                        <th className="p-4 font-bold">Type</th>
                        <th className="p-4 font-bold">Status</th>
                        <th className="p-4 font-bold text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E2D3]">
                      {paginatedItems.map(item => {
                        const room = item as Room;
                        return (
                          <tr key={room._id} className="hover:bg-[#FDFBF7]">
                            <td className="p-4 font-bold">{room.roomNumber}</td>
                            <td className="p-4">{
                              (typeof room.hotel === 'string' ? hotels.find(h => h._id === room.hotel)?.name : (room.hotel as Hotel)?.name)
                            }</td>
                            <td className="p-4">{
                              (typeof room.type === 'string' ? roomTypes.find(t => t._id === room.type)?.name : (room.type as RoomType)?.name)
                            }</td>
                            <td className="p-4">
                              <span className={`px-3 py-1 text-xs rounded-full font-semibold ${room.status === 'available' ? 'bg-green-50 text-green-700' :
                                room.status === 'occupied' ? 'bg-gray-100 text-gray-700' :
                                  'bg-red-50 text-red-700'
                                }`}>
                                {room.status}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex justify-center gap-2">
                                <button onClick={() => openModal(room)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"><BsPencil /></button>
                                <button onClick={() => handleDelete(room._id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"><BsTrash /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {renderPagination()}

          </div>
        ) : (
          <div className="animate-fade-in">
            {/* TYPES OVERVIEW */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E6E2D3] flex items-center gap-4">
                  <div className="p-4 rounded-full bg-indigo-50 text-indigo-600">
                    <BsTags size={24} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold">Total Types</p>
                    <h3 className="text-2xl font-serif font-bold text-[#5D4037]">{typeMetrics.total}</h3>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E6E2D3] flex items-center gap-4">
                  <div className="p-4 rounded-full bg-emerald-50 text-emerald-600">
                    <BsCurrencyDollar size={24} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold">Avg Price</p>
                    <h3 className="text-2xl font-serif font-bold text-[#5D4037]">${typeMetrics.avgPrice.toFixed(0)}</h3>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E6E2D3] flex items-center gap-4">
                  <div className="p-4 rounded-full bg-amber-50 text-amber-600">
                    <BsGraphUp size={24} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold">Range</p>
                    <h3 className="text-lg font-serif font-bold text-[#5D4037]">${typeMetrics.minPrice} - ${typeMetrics.maxPrice}</h3>
                  </div>
                </div>
              </div>

              {/* Bar Chart */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E6E2D3] flex flex-col justify-center">
                <h4 className="text-sm font-bold text-[#5D4037] mb-2 flex items-center gap-2"><BsGraphUp /> Price per Type</h4>
                <div className="w-full h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={typeMetrics.priceData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6E2D3" />
                      <XAxis dataKey="name" stroke="#5D4037" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{ fill: '#F9F7F2' }} contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E6E2D3' }} />
                      <Bar dataKey="price" fill="#8D6E63" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* TYPES CONTROLS */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#E6E2D3] mb-6 flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
              <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto">
                <div className="relative group w-full md:w-64">
                  <BsSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search type name..."
                    className="pl-10 pr-4 py-2 w-full bg-[#F9F7F2] border border-[#E6E2D3] rounded-xl focus:ring-2 focus:ring-[#8D6E63] outline-none"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  className="px-3 py-2 rounded-xl bg-[#F9F7F2] border border-[#E6E2D3] text-sm"
                  value={hotelFilter}
                  onChange={e => setHotelFilter(e.target.value)}
                >
                  <option value="all">Hotel: All</option>
                  {hotels.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
                </select>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min $$"
                    className="w-20 px-3 py-2 rounded-xl bg-[#F9F7F2] border border-[#E6E2D3] text-sm outline-none focus:ring-2 focus:ring-[#8D6E63]"
                    value={priceRangeFilter.min}
                    onChange={e => setPriceRangeFilter(prev => ({ ...prev, min: e.target.value }))}
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="number"
                    placeholder="Max $$"
                    className="w-20 px-3 py-2 rounded-xl bg-[#F9F7F2] border border-[#E6E2D3] text-sm outline-none focus:ring-2 focus:ring-[#8D6E63]"
                    value={priceRangeFilter.max}
                    onChange={e => setPriceRangeFilter(prev => ({ ...prev, max: e.target.value }))}
                  />
                </div>
                <input
                  type="number"
                  min="1"
                  placeholder="Min Occ."
                  className="w-24 px-3 py-2 rounded-xl bg-[#F9F7F2] border border-[#E6E2D3] text-sm outline-none focus:ring-2 focus:ring-[#8D6E63]"
                  value={occupancyFilter}
                  onChange={e => setOccupancyFilter(e.target.value)}
                />
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#5D4037] border border-[#E6E2D3] rounded-xl hover:bg-[#F9F7F2] transition-colors cursor-pointer"
                >
                  Reset
                </button>
              </div>

              <div className="flex gap-3 w-full md:w-auto justify-between md:justify-end">
                <div className="flex bg-[#F9F7F2] p-1 rounded-lg">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md cursor-pointer ${viewMode === 'grid' ? 'bg-white shadow text-[#5D4037]' : 'text-gray-400'}`}
                  >
                    <BsGrid />
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-2 rounded-md cursor-pointer ${viewMode === 'table' ? 'bg-white shadow text-[#5D4037]' : 'text-gray-400'}`}
                  >
                    <BsList />
                  </button>
                </div>
                <button
                  onClick={() => openModal()}
                  className="flex items-center gap-2 px-5 py-2 bg-[#5D4037] text-white rounded-xl font-bold hover:bg-[#3E2723] transition-colors shadow-lg cursor-pointer"
                >
                  <BsPlusCircle /> Add Type
                </button>
              </div>
            </div>

            {/* TYPES LIST */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedItems.map(item => {
                  const type = item as RoomType;
                  const hName = typeof type.hotel === 'string' ? hotels.find(h => h._id === type.hotel)?.name : (type.hotel as Hotel)?.name;

                  return (
                    <div key={type._id} className="bg-white rounded-2xl shadow-sm border border-[#E6E2D3] p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-serif font-bold text-[#5D4037] w-full truncate" title={type.name}>{type.name}</h4>
                        <span className="shrink-0 px-3 py-1 text-xs rounded-full font-semibold bg-[#F9F7F2] text-[#5D4037] border border-[#E6E2D3]">
                          Max {type.maxOccupancy}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p className="flex items-center gap-2"><BsHouseDoor className="text-gray-400" /> {hName || 'Unknown Hotel'}</p>
                        <p className="flex items-center gap-2 font-semibold text-[#8D6E63]"><BsCurrencyDollar /> {type.basePrice} / night</p>
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-2">{type.description}</p>
                      <div className="flex gap-2 pt-3 border-t border-dashed border-[#E6E2D3] mt-auto">
                        <button onClick={() => openModal(type)} className="flex-1 py-2 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-semibold cursor-pointer">Edit</button>
                        <button onClick={() => handleDelete(type._id)} className="flex-1 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-semibold cursor-pointer">Delete</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-[#E6E2D3] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#F9F7F2] text-[#5D4037] font-serif">
                      <tr>
                        <th className="p-4 font-bold">Name</th>
                        <th className="p-4 font-bold">Hotel</th>
                        <th className="p-4 font-bold">Price</th>
                        <th className="p-4 font-bold">Occupancy</th>
                        <th className="p-4 font-bold text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E2D3]">
                      {paginatedItems.map(item => {
                        const type = item as RoomType;
                        return (
                          <tr key={type._id} className="hover:bg-[#FDFBF7]">
                            <td className="p-4 font-bold">{type.name}</td>
                            <td className="p-4">{
                              (typeof type.hotel === 'string' ? hotels.find(h => h._id === type.hotel)?.name : (type.hotel as Hotel)?.name)
                            }</td>
                            <td className="p-4">${type.basePrice}</td>
                            <td className="p-4">{type.maxOccupancy} Guests</td>
                            <td className="p-4 text-center">
                              <div className="flex justify-center gap-2">
                                <button onClick={() => openModal(type)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><BsPencil /></button>
                                <button onClick={() => handleDelete(type._id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><BsTrash /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {renderPagination()}
          </div>
        )}

        {/* MODAL */}
        {showModal && (
          <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-[#2C2416]/70 backdrop-blur-md animate-fade-in">
            <div className={`bg-white dark:bg-[#1E1E1E] w-full ${activeTab === 'types' ? 'max-w-4xl' : 'max-w-2xl'} rounded-3xl shadow-2xl overflow-hidden border border-[#E6E2D3] dark:border-gray-700 flex flex-col max-h-[90vh]`}>
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-[#5D4037] to-[#8D6E63] p-6 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                    {activeTab === 'rooms' ? <BsHouseDoor size={24} /> : <BsTags size={24} />}
                  </div>
                  <div>
                    <h2 className="text-2xl font-serif font-bold tracking-wide">
                      {isEditing ? (activeTab === 'rooms' ? 'Edit Room' : 'Edit Type') : (activeTab === 'rooms' ? 'New Room' : 'New Type')}
                    </h2>
                    <p className="text-white/80 text-sm font-light">
                      {activeTab === 'rooms' ? 'Manage room properties' : 'Configure room type details'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-sm cursor-pointer"
                >
                  <BsX size={24} />
                </button>
              </div>

              <div className="flex flex-1 overflow-hidden">
                {/* Sidebar Tabs (Only for Room Types) */}
                {activeTab === 'types' && (
                  <div className="w-64 bg-[#F9F7F2] dark:bg-[#121212] border-r border-[#E6E2D3] dark:border-gray-800 p-6 space-y-2 shrink-0 hidden md:block">
                    {[
                      { id: 'general', label: 'General Info', icon: BsInfoCircle },
                      { id: 'details', label: 'Pricing & Occ.', icon: BsCurrencyDollar },
                      { id: 'amenities', label: 'Amenities', icon: BsWifi },
                      { id: 'media', label: 'Photos', icon: BsImages },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setModalTab(tab.id as any)}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-300 cursor-pointer ${modalTab === tab.id
                          ? 'bg-[#5D4037] text-white shadow-lg shadow-[#5D4037]/20 translate-x-1'
                          : 'text-[#6B5B4F] dark:text-gray-400 hover:bg-white dark:hover:bg-[#1E1E1E] hover:text-[#5D4037] dark:hover:text-[#FDF8F3]'
                          }`}
                      >
                        <tab.icon className={modalTab === tab.id ? 'text-[#D4AF37]' : ''} />
                        {tab.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Main Form Area */}
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#1E1E1E]">
                  <div className="flex-1 overflow-y-auto p-8">

                    {/* Mobile Tabs for Types */}
                    {activeTab === 'types' && (
                      <div className="md:hidden flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none">
                        {[
                          { id: 'general', label: 'General' },
                          { id: 'details', label: 'Details' },
                          { id: 'amenities', label: 'Amenities' },
                          { id: 'media', label: 'Media' },
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setModalTab(tab.id as any)}
                            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${modalTab === tab.id
                              ? 'bg-[#5D4037] text-white'
                              : 'bg-[#F9F7F2] text-[#6B5B4F]'
                              }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* ROOM FORM CONTENT */}
                    {activeTab === 'rooms' && (
                      <div className="space-y-6 animate-fade-in">
                        <div className="grid gap-6">
                          <div>
                            <label className="block text-xs font-bold text-[#6B5B4F] dark:text-gray-400 uppercase tracking-wider mb-2">Room Number</label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-xs">#</span>
                              <input
                                type="text"
                                className="w-full pl-8 pr-4 py-3 bg-gray-100 dark:bg-[#121212]/50 border border-[#E6E2D3] dark:border-gray-700 rounded-xl text-[#2C2416] dark:text-[#FDF8F3] font-bold cursor-not-allowed opacity-70"
                                value={roomForm.roomNumber}
                                readOnly
                                title="Auto-generated based on Hotel and Room Type"
                              />
                              {!isEditing && roomForm.hotel && roomForm.type && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
                                  Auto
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1 pl-1">
                              {isEditing ? 'Room number cannot be changed.' : 'Auto-generated based on selection.'}
                            </p>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[#6B5B4F] dark:text-gray-400 uppercase tracking-wider mb-2">Hotel</label>
                            <div className="relative">
                              <BsHouseDoor className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                              <select
                                className="w-full pl-10 pr-4 py-3 bg-[#F9F7F2] dark:bg-[#121212] border border-[#E6E2D3] dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#8D6E63] outline-none text-[#2C2416] dark:text-[#FDF8F3] font-medium appearance-none"
                                value={roomForm.hotel}
                                onChange={e => setRoomForm(prev => ({ ...prev, hotel: e.target.value }))}
                                required
                              >
                                <option value="">Select a hotel...</option>
                                {hotels.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[#6B5B4F] dark:text-gray-400 uppercase tracking-wider mb-2">Room Type</label>
                            <div className="relative">
                              <BsTags className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                              <select
                                className="w-full pl-10 pr-4 py-3 bg-[#F9F7F2] dark:bg-[#121212] border border-[#E6E2D3] dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#8D6E63] outline-none text-[#2C2416] dark:text-[#FDF8F3] font-medium appearance-none"
                                value={roomForm.type}
                                onChange={e => setRoomForm(prev => ({ ...prev, type: e.target.value }))}
                                required
                              >
                                <option value="">Select a type...</option>
                                {roomTypes.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[#6B5B4F] dark:text-gray-400 uppercase tracking-wider mb-2">Status</label>
                            <div className="grid grid-cols-3 gap-3">
                              {['available', 'occupied', 'maintenance'].map(status => (
                                <button
                                  key={status}
                                  type="button"
                                  onClick={() => setRoomForm(prev => ({ ...prev, status: status as RoomStatus }))}
                                  className={`py-3 px-2 rounded-xl text-sm font-bold capitalize transition-all border-2 cursor-pointer ${roomForm.status === status
                                    ? status === 'available' ? 'border-green-500 bg-green-50 text-green-700'
                                      : status === 'occupied' ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-red-500 bg-red-50 text-red-700'
                                    : 'border-transparent bg-[#F9F7F2] text-gray-500 hover:bg-gray-200'
                                    }`}
                                >
                                  {status}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ROOM TYPE FORM CONTENT */}
                    {activeTab === 'types' && (
                      <>
                        {modalTab === 'general' && (
                          <div className="space-y-6 animate-fade-in">
                            <h3 className="text-xl font-serif font-bold text-[#5D4037] dark:text-[#FDF8F3] border-b border-[#E6E2D3] dark:border-gray-800 pb-2">
                              Basic Information
                            </h3>
                            <div className="grid gap-6">
                              <div>
                                <label className="block text-xs font-bold text-[#6B5B4F] dark:text-gray-400 uppercase tracking-wider mb-2">Type Name</label>
                                <input
                                  type="text"
                                  className="w-full px-4 py-3 bg-[#F9F7F2] dark:bg-[#121212] border border-[#E6E2D3] dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#8D6E63] outline-none text-[#2C2416] dark:text-[#FDF8F3] font-medium"
                                  value={typeForm.name}
                                  onChange={e => setTypeForm(prev => ({ ...prev, name: e.target.value }))}
                                  required
                                  placeholder="e.g. Deluxe Suite"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-[#6B5B4F] dark:text-gray-400 uppercase tracking-wider mb-2">Hotel</label>
                                <div className="relative">
                                  <BsHouseDoor className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                  <select
                                    className="w-full pl-10 pr-4 py-3 bg-[#F9F7F2] dark:bg-[#121212] border border-[#E6E2D3] dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#8D6E63] outline-none text-[#2C2416] dark:text-[#FDF8F3] font-medium appearance-none"
                                    value={typeForm.hotel}
                                    onChange={e => setTypeForm(prev => ({ ...prev, hotel: e.target.value }))}
                                    required
                                  >
                                    <option value="">Select hotel...</option>
                                    {hotels.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
                                  </select>
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-[#6B5B4F] dark:text-gray-400 uppercase tracking-wider mb-2">Description</label>
                                <textarea
                                  rows={5}
                                  className="w-full px-4 py-3 bg-[#F9F7F2] dark:bg-[#121212] border border-[#E6E2D3] dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#8D6E63] outline-none text-[#2C2416] dark:text-[#FDF8F3] font-medium resize-none"
                                  value={typeForm.description}
                                  onChange={e => setTypeForm(prev => ({ ...prev, description: e.target.value }))}
                                  placeholder="Describe the room features..."
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {modalTab === 'details' && (
                          <div className="space-y-6 animate-fade-in">
                            <h3 className="text-xl font-serif font-bold text-[#5D4037] dark:text-[#FDF8F3] border-b border-[#E6E2D3] dark:border-gray-800 pb-2">
                              Pricing & Occupancy
                            </h3>
                            <div className="grid gap-6">
                              <div>
                                <label className="block text-xs font-bold text-[#6B5B4F] dark:text-gray-400 uppercase tracking-wider mb-2">Base Price (per night)</label>
                                <div className="relative">
                                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8D6E63] font-bold">$</span>
                                  <input
                                    type="number"
                                    className="w-full pl-10 pr-4 py-3 bg-[#F9F7F2] dark:bg-[#121212] border border-[#E6E2D3] dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#8D6E63] outline-none text-[#2C2416] dark:text-[#FDF8F3] font-medium text-lg"
                                    value={typeForm.basePrice}
                                    onChange={e => setTypeForm(prev => ({ ...prev, basePrice: Number(e.target.value) }))}
                                    required
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-[#6B5B4F] dark:text-gray-400 uppercase tracking-wider mb-2">Max Occupancy</label>
                                <div className="flex items-center gap-4">
                                  <button
                                    type="button"
                                    onClick={() => setTypeForm(prev => ({ ...prev, maxOccupancy: Math.max(1, prev.maxOccupancy - 1) }))}
                                    className="w-12 h-12 rounded-xl bg-[#F9F7F2] hover:bg-[#E6E2D3] text-[#5D4037] flex items-center justify-center font-bold text-xl transition-colors cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min={1}
                                    className="w-24 text-center py-3 bg-[#F9F7F2] dark:bg-[#121212] border border-[#E6E2D3] dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#8D6E63] outline-none text-[#2C2416] dark:text-[#FDF8F3] font-bold text-lg"
                                    value={typeForm.maxOccupancy}
                                    onChange={e => setTypeForm(prev => ({ ...prev, maxOccupancy: Number(e.target.value) }))}
                                    required
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setTypeForm(prev => ({ ...prev, maxOccupancy: prev.maxOccupancy + 1 }))}
                                    className="w-12 h-12 rounded-xl bg-[#F9F7F2] hover:bg-[#E6E2D3] text-[#5D4037] flex items-center justify-center font-bold text-xl transition-colors cursor-pointer"
                                  >
                                    +
                                  </button>
                                  <span className="text-sm text-gray-500 font-medium">Guests</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {modalTab === 'amenities' && (
                          <div className="space-y-6 animate-fade-in">
                            <h3 className="text-xl font-serif font-bold text-[#5D4037] dark:text-[#FDF8F3] border-b border-[#E6E2D3] dark:border-gray-800 pb-2">
                              Room Amenities
                            </h3>
                            <div>
                              <label className="block text-xs font-bold text-[#6B5B4F] dark:text-gray-400 uppercase tracking-wider mb-2">Features List</label>
                              <div className="relative">
                                <BsWifi className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                  type="text"
                                  placeholder="Wifi, TV, Ocean View, Mini Bar..."
                                  className="w-full pl-10 pr-4 py-3 bg-[#F9F7F2] dark:bg-[#121212] border border-[#E6E2D3] dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#8D6E63] outline-none text-[#2C2416] dark:text-[#FDF8F3] font-medium"
                                  value={typeForm.amenities}
                                  onChange={e => setTypeForm(prev => ({ ...prev, amenities: e.target.value }))}
                                />
                              </div>
                              <p className="text-xs text-[#8D6E63] mt-2 flex items-center gap-1">
                                <BsInfoCircle /> Separate amenities with commas
                              </p>

                              <div className="mt-4 flex flex-wrap gap-2">
                                {typeForm.amenities.split(',').filter(a => a.trim()).map((a, i) => (
                                  <span key={i} className="px-3 py-1 bg-[#E6E2D3] text-[#5D4037] rounded-full text-xs font-bold flex items-center gap-1">
                                    <BsCheckCircle size={10} /> {a.trim()}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {modalTab === 'media' && (
                          <div className="space-y-6 animate-fade-in">
                            <h3 className="text-xl font-serif font-bold text-[#5D4037] dark:text-[#FDF8F3] border-b border-[#E6E2D3] dark:border-gray-800 pb-2">
                              Gallery & Photos
                            </h3>
                            <div className="w-full aspect-video rounded-2xl border-2 border-dashed border-[#E6E2D3] dark:border-gray-700 bg-[#F9F7F2] dark:bg-[#121212] flex flex-col items-center justify-center relative group hover:border-[#8D6E63] transition-colors cursor-pointer">
                              <input
                                type="file"
                                multiple
                                accept="image/*"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                onChange={e => {
                                  if (e.target.files) {
                                    setTypeForm(prev => ({ ...prev, files: Array.from(e.target.files || []) }));
                                  }
                                }}
                              />
                              <div className="p-4 rounded-full bg-white dark:bg-[#2C2416] shadow-sm mb-4 group-hover:scale-110 transition-transform">
                                <BsCloudUpload className="text-3xl text-[#8D6E63]" />
                              </div>
                              <h4 className="text-lg font-bold text-[#5D4037] dark:text-[#FDF8F3]">Click to upload photos</h4>
                              <p className="text-sm text-[#6B5B4F] dark:text-gray-400 mt-2">SVG, PNG, JPG or GIF (max. 5MB)</p>
                            </div>

                            {typeForm.files.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-sm font-bold text-[#5D4037]">{typeForm.files.length} files selected</p>
                                <div className="flex flex-wrap gap-2">
                                  {typeForm.files.map((file, i) => (
                                    <div key={i} className="px-3 py-1 bg-[#E6E2D3] rounded-md text-xs text-[#5D4037] flex items-center gap-2">
                                      <BsFileText /> {file.name}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="p-6 bg-gray-50 dark:bg-[#121212] border-t border-[#E6E2D3] dark:border-gray-800 flex justify-end gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-6 py-2.5 rounded-xl text-[#5D4037] font-bold hover:bg-[#E6E2D3] transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-8 py-2.5 bg-gradient-to-r from-[#5D4037] to-[#8D6E63] text-white font-bold rounded-xl shadow-lg shadow-[#5D4037]/20 hover:shadow-xl hover:shadow-[#5D4037]/30 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {activeTab === 'rooms' ? (isEditing ? 'Save Room' : 'Create Room') : (isEditing ? 'Save Type' : 'Create Type')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>

    </AdminLayout >
  );
};

export default ManageRooms;
