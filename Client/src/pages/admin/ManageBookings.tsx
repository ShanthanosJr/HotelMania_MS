import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../utils/api';
import AdminLayout from '../../components/AdminLayout';
import {
    BsCalendarCheck, BsCurrencyDollar, BsHouseDoor,
    BsSearch, BsFilter, BsGrid, BsList, BsPlusCircle, BsArrowLeft,
    BsThreeDotsVertical, BsPencil, BsTrash, BsX, BsCheckCircle,
    BsWallet2, BsClock, BsChevronLeft, BsChevronRight
} from 'react-icons/bs';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

// --- Types based on your data structure ---
interface User {
    _id: string;
    name: string;
    email: string;
}

interface Room {
    _id: string;
    roomNumber: string;
    type: { name: string; price: number };
}

interface Booking {
    _id: string;
    user: User | string; // Handle populated or unpopulated
    room: Room | string;
    checkInDate: string;
    checkOutDate: string;
    totalPrice: number;
    status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
    paymentStatus: 'pending' | 'paid' | 'refunded';
}

const isAuthenticated = () => {
    const token = localStorage.getItem('token');
    return token !== null && token !== undefined && token !== '';
};

const ManageBookings: React.FC = () => {
    // --- Original State Logic ---
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [bookingForm, setBookingForm] = useState({
        user: '',
        room: '',
        checkInDate: '',
        checkOutDate: '',
        totalPrice: '',
        status: 'pending',
        paymentStatus: 'pending'
    });
    const [editingId, setEditingId] = useState<string | null>(null);

    // --- UI State ---
    const [viewMode, setViewMode] = useState<'overview' | 'grid' | 'table'>('overview');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [showModal, setShowModal] = useState(false);

    // --- Pagination State ---
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, _setItemsPerPage] = useState(10);

    // --- Theme Colors ---
    const colors = {
        brown: '#8D6E63',
        green: '#10B981',
        red: '#EF4444',
        gold: '#D4AF37'
    };

    // --- Data Fetching (Preserving your Logic) ---
    const fetchBookings = async () => {
        try {
            setLoading(true);
            const [bookingsRes, usersRes, roomsRes] = await Promise.all([
                api.get('/api/bookings'),
                api.get('/api/users'),
                api.get('/api/rooms')
            ]);

            // Handle potential different response structures (adjust keys if needed based on your API)
            const bookingsJson = await bookingsRes.json();
            const usersJson = await usersRes.json();
            const roomsJson = await roomsRes.json();

            const bookingsData = bookingsJson.data || [];
            const usersData = usersJson.data || [];
            const roomsData = roomsJson.data || [];

            setBookings(Array.isArray(bookingsData) ? bookingsData : []);
            setUsers(Array.isArray(usersData) ? usersData : []);
            setRooms(Array.isArray(roomsData) ? roomsData : []);

        } catch (err: any) {
            console.error("Error fetching data:", err);
            setError('Failed to load dashboard data. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated()) {
            fetchBookings();
        } else {
            setError('Authentication required.');
        }
    }, []);

    // --- Form Handlers (Preserving your Logic) ---
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setBookingForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const resetForm = () => {
        setBookingForm({
            user: '',
            room: '',
            checkInDate: '',
            checkOutDate: '',
            totalPrice: '',
            status: 'pending',
            paymentStatus: 'pending'
        });
        setEditingId(null);
        setShowModal(false);
    };

    const handleEdit = (booking: Booking) => {
        setEditingId(booking._id);
        setBookingForm({
            user: (booking.user && typeof booking.user === 'object') ? booking.user._id : (booking.user as string) || '',
            room: (booking.room && typeof booking.room === 'object') ? booking.room._id : (booking.room as string) || '',
            checkInDate: booking.checkInDate ? booking.checkInDate.split('T')[0] : '',
            checkOutDate: booking.checkOutDate ? booking.checkOutDate.split('T')[0] : '',
            totalPrice: booking.totalPrice ? booking.totalPrice.toString() : '0',
            status: booking.status || 'pending',
            paymentStatus: booking.paymentStatus || 'pending'
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);

            let res;
            if (editingId) {
                res = await api.put(`/api/bookings/${editingId}`, bookingForm);
            } else {
                res = await api.post('/api/bookings', bookingForm);
            }

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Operation failed');
            }

            alert(editingId ? 'Booking updated successfully!' : 'Booking created successfully!');

            resetForm();
            fetchBookings();
        } catch (err: any) {
            console.error(err);
            alert(err.message || 'Operation failed');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this booking?')) {
            try {
                const res = await api.delete(`/api/bookings/${id}`);
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.message || 'Failed to delete booking');
                }
                fetchBookings();
            } catch (err: any) {
                console.error(err);
                alert(err.message || 'Failed to delete booking');
            }
        }
    };

    // --- Derived Metrics for Dashboard ---
    const metrics = useMemo(() => {
        const total = bookings.length;
        const revenue = bookings.reduce((sum, b) => sum + (Number(b.totalPrice) || 0), 0);
        const confirmed = bookings.filter(b => ['confirmed', 'checked_in'].includes(b.status)).length;
        const pending = bookings.filter(b => b.status === 'pending').length;

        // Generate chart data (grouped by booking date for revenue)
        const revenueMap: Record<string, number> = {};
        bookings.forEach(b => {
            const date = new Date(b.checkInDate).toLocaleDateString('en-US', { weekday: 'short' });
            revenueMap[date] = (revenueMap[date] || 0) + (Number(b.totalPrice) || 0);
        });

        // Sort logic needed for real dates, simple mapping for now
        const revenueData = Object.keys(revenueMap).map(key => ({ name: key, revenue: revenueMap[key] }));

        const statusData = [
            { name: 'Confirmed', value: confirmed, color: colors.green },
            { name: 'Pending', value: pending, color: colors.gold },
            { name: 'Cancelled', value: bookings.filter(b => b.status === 'cancelled').length, color: colors.red },
        ];

        return { total, revenue, confirmed, pending, revenueData, statusData };
    }, [bookings]);

    // --- Filtering ---
    const filteredBookings = bookings.filter(b => {
        const userName = b.user && typeof b.user === 'object' ? b.user.name : 'Unknown';
        const roomNum = b.room && typeof b.room === 'object' ? b.room.roomNumber : 'Unknown';

        const matchesSearch = userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            roomNum.toString().includes(searchTerm);
        const matchesStatus = filterStatus === 'all' || b.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    // --- Pagination Logic ---
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentBookings = filteredBookings.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);

    const showingStart = filteredBookings.length > 0 ? indexOfFirstItem + 1 : 0;
    const showingEnd = Math.min(indexOfLastItem, filteredBookings.length);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterStatus]);

    // --- Helpers ---
    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            confirmed: 'bg-green-100 text-green-800 border-green-200',
            checked_in: 'bg-blue-100 text-blue-800 border-blue-200',
            checked_out: 'bg-gray-100 text-gray-800 border-gray-200',
            cancelled: 'bg-red-100 text-red-800 border-red-200',
        };
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${styles[status] || styles.pending}`}>
                {status.replace('_', ' ')}
            </span>
        );
    };

    if (error) return <div className="flex h-screen items-center justify-center text-red-600 bg-[#F9F7F2]">{error}</div>;

    return (
        <AdminLayout>

            {/* --- 1. HERO HEADER --- */}
            <div className="relative bg-gradient-to-r from-[#5D4037] to-[#8D6E63] text-[#F9F7F2] px-8 py-10 shadow-lg mb-8 overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-10 -mb-10 pointer-events-none"></div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6 max-w-7xl mx-auto">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-inner">
                                <BsCalendarCheck className="text-3xl text-[#E6E2D3]" />
                            </div>
                            <h1 className="text-4xl font-serif font-bold tracking-tight">Booking Administration</h1>
                        </div>
                        <p className="text-[#E6E2D3] text-lg font-light max-w-xl">
                            Manage reservations, track revenue, and oversee guest experiences.
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => window.history.back()}
                            className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 rounded-full transition-all duration-300 font-semibold cursor-pointer"
                        >
                            <BsArrowLeft /> Back
                        </button>
                        <button
                            onClick={() => { resetForm(); setShowModal(true); }}
                            className="flex items-center gap-2 px-6 py-3 bg-[#E6E2D3] text-[#5D4037] hover:bg-white hover:shadow-xl rounded-full transition-all duration-300 font-bold shadow-lg transform hover:-translate-y-1 cursor-pointer"
                        >
                            <BsPlusCircle /> Add Booking
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 pb-12">

                {/* --- 2. KPI STATS CARDS --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    {[
                        { label: 'Total Bookings', value: metrics.total, icon: BsHouseDoor, color: 'text-blue-600', bg: 'bg-blue-50' },
                        { label: 'Total Revenue', value: `$${metrics.revenue.toLocaleString()}`, icon: BsCurrencyDollar, color: 'text-[#8D6E63]', bg: 'bg-[#FDFBF7]' },
                        { label: 'Confirmed', value: metrics.confirmed, icon: BsCheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
                        { label: 'Pending', value: metrics.pending, icon: BsClock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
                    ].map((stat, idx) => (
                        <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-[#E6E2D3] flex items-center gap-4">
                            <div className={`p-4 rounded-full ${stat.bg} ${stat.color} bg-opacity-50`}>
                                <stat.icon size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">{stat.label}</p>
                                <h3 className="text-2xl font-serif font-bold text-[#5D4037]">{stat.value}</h3>
                            </div>
                        </div>
                    ))}
                </div>

                {/* --- 3. TOOLBAR & FILTERS --- */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#E6E2D3] mb-8 flex flex-col lg:flex-row justify-between items-center gap-4">

                    {/* View Switcher */}
                    <div className="flex bg-[#F9F7F2] p-1 rounded-xl">
                        {[
                            { id: 'overview', label: 'Overview', icon: BsThreeDotsVertical },
                            { id: 'grid', label: 'Grid', icon: BsGrid },
                            { id: 'table', label: 'Table', icon: BsList },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setViewMode(tab.id as any)}
                                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-300 ${viewMode === tab.id
                                    ? 'bg-[#5D4037] text-white shadow-md'
                                    : 'text-gray-500 hover:text-[#5D4037] hover:bg-gray-100'
                                    }`}
                            >
                                <tab.icon /> {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Search & Filter */}
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        <div className="relative group flex-1 lg:flex-none">
                            <BsSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#8D6E63] transition-colors" />
                            <input
                                type="text"
                                placeholder="Search guests or rooms..."
                                className="pl-10 pr-4 py-2.5 w-full lg:w-64 bg-[#F9F7F2] border border-[#E6E2D3] rounded-xl focus:ring-2 focus:ring-[#8D6E63] focus:outline-none transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="relative">
                            <BsFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <select
                                className="pl-10 pr-8 py-2.5 bg-[#F9F7F2] border border-[#E6E2D3] rounded-xl focus:ring-2 focus:ring-[#8D6E63] focus:outline-none appearance-none cursor-pointer"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                <option value="all">All Status</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="pending">Pending</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* --- 4. MAIN CONTENT AREA --- */}
                {loading ? (
                    <div className="flex justify-center py-20 text-[#8D6E63]">
                        <span className="animate-pulse font-serif text-xl">Loading records...</span>
                    </div>
                ) : (
                    <>
                        {/* VIEW: OVERVIEW */}
                        {viewMode === 'overview' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-[#E6E2D3]">
                                    <h3 className="text-xl font-serif font-bold text-[#5D4037] mb-6 flex items-center gap-2">
                                        <BsWallet2 className="text-[#8D6E63]" /> Revenue Trends
                                    </h3>
                                    <div className="h-[350px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={metrics.revenueData}>
                                                <defs>
                                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#8D6E63" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#8D6E63" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6E2D3" />
                                                <XAxis dataKey="name" stroke="#5D4037" fontSize={12} tickLine={false} axisLine={false} />
                                                <YAxis stroke="#5D4037" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                                                <Tooltip contentStyle={{ backgroundColor: '#F9F7F2', borderRadius: '12px', border: 'none' }} />
                                                <Area type="monotone" dataKey="revenue" stroke="#8D6E63" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E6E2D3]">
                                    <h3 className="text-xl font-serif font-bold text-[#5D4037] mb-6 flex items-center gap-2">
                                        <BsCalendarCheck className="text-[#8D6E63]" /> Status
                                    </h3>
                                    <div className="h-[350px] flex items-center justify-center">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={metrics.statusData} innerRadius={80} outerRadius={110} paddingAngle={5} dataKey="value">
                                                    {metrics.statusData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                                <Legend verticalAlign="bottom" height={36} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* VIEW: GRID */}
                        {viewMode === 'grid' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                                {currentBookings.map((booking) => (
                                    <div key={booking._id} className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-[#E6E2D3] overflow-hidden flex flex-col">
                                        <div className="h-2 w-full bg-gradient-to-r from-[#5D4037] to-[#8D6E63]"></div>
                                        <div className="p-6 flex-1">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h4 className="text-lg font-bold text-[#5D4037] group-hover:text-[#8D6E63] transition-colors">
                                                        {(booking.user && typeof booking.user === 'object') ? booking.user.name : 'Unknown User'}
                                                    </h4>
                                                    <p className="text-sm text-gray-500">
                                                        {(booking.user && typeof booking.user === 'object') ? booking.user.email : ''}
                                                    </p>
                                                </div>
                                                {getStatusBadge(booking.status)}
                                            </div>

                                            <div className="space-y-3 py-4 border-t border-b border-dashed border-[#E6E2D3]">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500">Room</span>
                                                    <span className="font-semibold text-[#5D4037]">
                                                        {(booking.room && typeof booking.room === 'object') ? `${booking.room.roomNumber} - ${booking.room.type.name}` : (booking.room || 'Unknown Room')}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500">Check-In</span>
                                                    <span className="font-semibold text-[#5D4037]">{new Date(booking.checkInDate).toLocaleDateString()}</span>
                                                </div>
                                            </div>

                                            <div className="mt-4 flex justify-between items-center">
                                                <span className="text-xl font-bold text-[#8D6E63]">${booking.totalPrice}</span>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleEdit(booking)} className="p-2 text-blue-600 hover:text-[#5D4037] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
                                                        <BsPencil />
                                                    </button>
                                                    <button onClick={() => handleDelete(booking._id)} className="p-2 text-red-600 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
                                                        <BsTrash />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* VIEW: TABLE */}
                        {viewMode === 'table' && (
                            <div className="bg-white rounded-2xl shadow-sm border border-[#E6E2D3] overflow-hidden animate-fade-in">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-[#F9F7F2] text-[#5D4037] font-serif">
                                            <tr>
                                                <th className="p-5 font-bold border-b border-[#E6E2D3]">Guest</th>
                                                <th className="p-5 font-bold border-b border-[#E6E2D3]">Room</th>
                                                <th className="p-5 font-bold border-b border-[#E6E2D3]">Dates</th>
                                                <th className="p-5 font-bold border-b border-[#E6E2D3]">Status</th>
                                                <th className="p-5 font-bold border-b border-[#E6E2D3]">Payment</th>
                                                <th className="p-5 font-bold border-b border-[#E6E2D3] text-right">Total</th>
                                                <th className="p-5 font-bold border-b border-[#E6E2D3] text-center">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#E6E2D3]">
                                            {currentBookings.map((booking) => (
                                                <tr key={booking._id} className="hover:bg-[#FDFBF7] transition-colors">
                                                    <td className="p-5">
                                                        <div className="font-bold text-[#5D4037]">
                                                            {(booking.user && typeof booking.user === 'object') ? booking.user.name : 'Unknown User'}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {(booking.user && typeof booking.user === 'object') ? booking.user.email : ''}
                                                        </div>
                                                    </td>
                                                    <td className="p-5">
                                                        <span className="px-2 py-1 bg-gray-100 rounded text-sm font-medium">
                                                            {(booking.room && typeof booking.room === 'object') ? booking.room.roomNumber : (booking.room || '-')}
                                                        </span>
                                                    </td>
                                                    <td className="p-5 text-sm text-[#5D4037]">
                                                        <div>In: <span className="font-medium">{new Date(booking.checkInDate).toLocaleDateString()}</span></div>
                                                        <div>Out: <span className="font-medium">{new Date(booking.checkOutDate).toLocaleDateString()}</span></div>
                                                    </td>
                                                    <td className="p-5">{getStatusBadge(booking.status)}</td>
                                                    <td className="p-5">
                                                        <span className={`text-sm font-semibold ${booking.paymentStatus === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                                                            {booking.paymentStatus.toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td className="p-5 text-right font-bold text-[#8D6E63]">${booking.totalPrice}</td>
                                                    <td className="p-5 text-center">
                                                        <div className="flex justify-center gap-2">
                                                            <button onClick={() => handleEdit(booking)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer">
                                                                <BsPencil />
                                                            </button>
                                                            <button onClick={() => handleDelete(booking._id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer">
                                                                <BsTrash />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* --- PAGINATION CONTROLS --- */}
            {!loading && filteredBookings.length > 0 && (
                <div className="max-w-7xl mx-auto px-6 pb-12">
                    <div className="flex flex-col md:flex-row justify-between items-center p-6 bg-white border border-[#E6E2D3] rounded-2xl shadow-sm">

                        {/* Status Text */}
                        <div className="text-sm text-[#5D4037] mb-4 md:mb-0">
                            Showing <span className="font-bold">{showingStart}</span> to <span className="font-bold">{showingEnd}</span> of <span className="font-bold">{filteredBookings.length}</span> entries
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg border border-[#E6E2D3] text-[#5D4037] hover:bg-[#F9F7F2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            >
                                <BsChevronLeft />
                            </button>

                            <div className="flex gap-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                                    <button
                                        key={number}
                                        onClick={() => setCurrentPage(number)}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${currentPage === number
                                            ? 'bg-[#5D4037] text-white shadow-md'
                                            : 'bg-white border border-[#E6E2D3] text-[#5D4037] hover:bg-[#F9F7F2]'
                                            }`}
                                    >
                                        {number}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg border border-[#E6E2D3] text-[#5D4037] hover:bg-[#F9F7F2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            >
                                <BsChevronRight />
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* --- 5. ADD/EDIT MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-[#2C2416]/70 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-[#E6E2D3] dark:border-gray-700 max-h-[90vh] flex flex-col">

                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-[#5D4037] to-[#8D6E63] p-6 text-white flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                                    <BsCalendarCheck size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-serif font-bold tracking-wide">
                                        {editingId ? 'Edit Reservation' : 'New Reservation'}
                                    </h2>
                                    <p className="text-white/80 text-sm font-light">
                                        {editingId ? 'Modify existing booking details' : 'Create a new guest reservation'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={resetForm}
                                className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-sm cursor-pointer"
                            >
                                <BsX size={24} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 bg-white dark:bg-[#1E1E1E]">
                            <div className="space-y-8">

                                {/* Section 1: Review Guest & Room */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-serif font-bold text-[#5D4037] dark:text-[#FDF8F3] border-b border-[#E6E2D3] dark:border-gray-800 pb-2 flex items-center gap-2">
                                        <BsHouseDoor className="text-[#8D6E63]" /> Guest & Room
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-bold text-[#6B5B4F] dark:text-gray-400 uppercase tracking-wider mb-2">Select Guest</label>
                                            <div className="relative">
                                                <select
                                                    name="user"
                                                    value={bookingForm.user}
                                                    onChange={handleInputChange}
                                                    className="w-full p-3 bg-[#F9F7F2] dark:bg-[#121212] border border-[#E6E2D3] dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#8D6E63] outline-none text-[#2C2416] dark:text-[#FDF8F3] font-medium appearance-none cursor-pointer"
                                                    required
                                                >
                                                    <option value="">Select a guest...</option>
                                                    {users.map(u => (
                                                        <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                    <BsChevronLeft className="-rotate-90 text-xs" />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-[#6B5B4F] dark:text-gray-400 uppercase tracking-wider mb-2">Assign Room</label>
                                            <div className="relative">
                                                <select
                                                    name="room"
                                                    value={bookingForm.room}
                                                    onChange={handleInputChange}
                                                    className="w-full p-3 bg-[#F9F7F2] dark:bg-[#121212] border border-[#E6E2D3] dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#8D6E63] outline-none text-[#2C2416] dark:text-[#FDF8F3] font-medium appearance-none cursor-pointer"
                                                    required
                                                >
                                                    <option value="">Select a room...</option>
                                                    {rooms.map(r => (
                                                        <option key={r._id} value={r._id}>Room {r.roomNumber} - {r.type?.name} (${r.type?.price})</option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                    <BsChevronLeft className="-rotate-90 text-xs" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Dates & Pricing */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-serif font-bold text-[#5D4037] dark:text-[#FDF8F3] border-b border-[#E6E2D3] dark:border-gray-800 pb-2 flex items-center gap-2">
                                        <BsCalendarCheck className="text-[#8D6E63]" /> Stay Details
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div>
                                            <label className="block text-xs font-bold text-[#6B5B4F] dark:text-gray-400 uppercase tracking-wider mb-2">Check-in</label>
                                            <input
                                                type="date"
                                                name="checkInDate"
                                                value={bookingForm.checkInDate}
                                                onChange={handleInputChange}
                                                className="w-full p-3 bg-[#F9F7F2] dark:bg-[#121212] border border-[#E6E2D3] dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#8D6E63] outline-none text-[#2C2416] dark:text-[#FDF8F3] font-medium cursor-pointer"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-[#6B5B4F] dark:text-gray-400 uppercase tracking-wider mb-2">Check-out</label>
                                            <input
                                                type="date"
                                                name="checkOutDate"
                                                value={bookingForm.checkOutDate}
                                                onChange={handleInputChange}
                                                className="w-full p-3 bg-[#F9F7F2] dark:bg-[#121212] border border-[#E6E2D3] dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#8D6E63] outline-none text-[#2C2416] dark:text-[#FDF8F3] font-medium cursor-pointer"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-[#6B5B4F] dark:text-gray-400 uppercase tracking-wider mb-2">Total Price ($)</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8D6E63] font-bold">$</span>
                                                <input
                                                    type="number"
                                                    name="totalPrice"
                                                    value={bookingForm.totalPrice}
                                                    onChange={handleInputChange}
                                                    placeholder="0.00"
                                                    className="w-full pl-10 pr-4 py-3 bg-[#F9F7F2] dark:bg-[#121212] border border-[#E6E2D3] dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#8D6E63] outline-none text-[#2C2416] dark:text-[#FDF8F3] font-bold text-lg"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 3: Status */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-serif font-bold text-[#5D4037] dark:text-[#FDF8F3] border-b border-[#E6E2D3] dark:border-gray-800 pb-2 flex items-center gap-2">
                                        <BsCheckCircle className="text-[#8D6E63]" /> Status Management
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-bold text-[#6B5B4F] dark:text-gray-400 uppercase tracking-wider mb-2">Reservation Status</label>
                                            <div className="flex flex-wrap gap-2">
                                                {['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'].map(status => (
                                                    <button
                                                        key={status}
                                                        type="button"
                                                        onClick={() => setBookingForm(prev => ({ ...prev, status }))}
                                                        className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide border transition-all cursor-pointer ${bookingForm.status === status
                                                            ? 'bg-[#5D4037] text-white border-[#5D4037] shadow-md'
                                                            : 'bg-[#F9F7F2] text-[#6B5B4F] border-[#E6E2D3] hover:bg-white'
                                                            }`}
                                                    >
                                                        {status.replace('_', ' ')}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-[#6B5B4F] dark:text-gray-400 uppercase tracking-wider mb-2">Payment Status</label>
                                            <div className="flex gap-2">
                                                {['pending', 'paid', 'refunded'].map(status => (
                                                    <button
                                                        key={status}
                                                        type="button"
                                                        onClick={() => setBookingForm(prev => ({ ...prev, paymentStatus: status }))}
                                                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide border transition-all cursor-pointer ${bookingForm.paymentStatus === status
                                                            ? (status === 'paid' ? 'bg-green-600 text-white border-green-600' : status === 'refunded' ? 'bg-red-500 text-white border-red-500' : 'bg-yellow-500 text-white border-yellow-500')
                                                            : 'bg-[#F9F7F2] text-[#6B5B4F] border-[#E6E2D3] hover:bg-white'
                                                            }`}
                                                    >
                                                        {status}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </form>

                        {/* Modal Footer */}
                        <div className="p-6 bg-gray-50 dark:bg-[#121212] border-t border-[#E6E2D3] dark:border-gray-800 flex justify-end gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-6 py-2.5 rounded-xl text-[#5D4037] font-bold hover:bg-[#E6E2D3] transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                type="button"
                                className="px-8 py-2.5 bg-gradient-to-r from-[#5D4037] to-[#8D6E63] text-white font-bold rounded-xl shadow-lg shadow-[#5D4037]/20 hover:shadow-xl hover:shadow-[#5D4037]/30 transform hover:-translate-y-0.5 transition-all cursor-pointer"
                            >
                                {editingId ? 'Update Booking' : 'Create Booking'}
                            </button>
                        </div>
                    </div>
                </div>
            )}


        </AdminLayout>
    );
};

export default ManageBookings;