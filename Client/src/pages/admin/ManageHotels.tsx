import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../utils/api';
import AdminLayout from '../../components/AdminLayout';
import {
    BsBuilding, BsStarFill, BsGeoAlt, BsTelephone,
    BsSearch, BsGrid, BsList, BsPlusCircle, BsArrowLeft,
    BsPencil, BsTrash, BsX, BsThreeDotsVertical, BsImages,
    BsChevronLeft, BsChevronRight, BsWallet2, BsCalendarCheck, BsCurrencyDollar, BsTrophy, BsBarChart,
    BsCloudUpload, BsInfoCircle, BsWifi, BsPhone
} from 'react-icons/bs';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';

// --- Types & Interfaces ---
interface Hotel {
    _id: string;
    name: string;
    address: string;
    description: string;
    rating: number;
    amenities: string[];
    photos: string[];
    contactInfo: {
        phone: string;
        email: string;
        website: string;
    };
}

interface HotelFormState {
    name: string;
    address: string;
    description: string;
    rating: string;
    amenities: string; // Comma separated for input
    phone: string;
    email: string;
    website: string;
    files: File[];
}

const isAuthenticated = () => {
    const token = localStorage.getItem('token');
    return token !== null && token !== undefined && token !== '';
};

const ManageHotels: React.FC = () => {
    // --- Data State ---
    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // --- UI State ---
    const [viewMode, setViewMode] = useState<'overview' | 'grid' | 'table'>('overview');
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'general' | 'details' | 'contact' | 'media'>('general');

    // --- Pagination State ---
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(9);

    // --- Form State ---
    const [formData, setFormData] = useState<HotelFormState>({
        name: '',
        address: '',
        description: '',
        rating: '0',
        amenities: '',
        phone: '',
        email: '',
        website: '',
        files: []
    });



    const chartColors = ['#8D6E63', '#5D4037', '#D4AF37', '#10B981', '#EF4444'];

    // --- API Functions ---
    const fetchHotels = async () => {
        try {
            setLoading(true);
            const res = await api.get('/api/hotels');
            const data = await res.json();

            // Handle different potential response structures
            // If data.data exists (common pattern), use it. Otherwise use data directly if it's an array.
            const hotelsList = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);

            setHotels(hotelsList);
        } catch (err: any) {
            console.error("Fetch Error:", err);
            setError('Failed to load hotels. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated()) fetchHotels();
        else setError('Authentication required.');
    }, []);

    // --- Derived Data (Search & Pagination) ---
    const filteredHotels = useMemo(() => {
        return hotels.filter(h =>
            h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            h.address.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [hotels, searchTerm]);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentHotels = filteredHotels.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredHotels.length / itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // --- Metrics ---
    const metrics = useMemo(() => {
        const total = hotels.length;
        const avgRating = total > 0
            ? (hotels.reduce((acc, h) => acc + (h.rating || 0), 0) / total).toFixed(1)
            : '0';

        // Distribution of ratings
        const ratingDist = [0, 0, 0, 0, 0]; // 1 to 5 stars
        hotels.forEach(hotel => {
            const r = Math.round(hotel.rating || 0);
            if (r >= 1 && r <= 5) ratingDist[r - 1]++;
        });

        const ratingData = ratingDist.map((count, i) => ({
            name: `${i + 1} Star`,
            count
        }));

        // Generate chart data for revenue trends (simulated data)
        const revenueMap: Record<string, number> = {};
        hotels.forEach(_hotel => {
            // For demo purposes, we'll create some random revenue data
            const date = new Date().toLocaleDateString('en-US', { weekday: 'short' });
            revenueMap[date] = (revenueMap[date] || 0) + Math.floor(Math.random() * 1000);
        });

        const revenueData = Object.keys(revenueMap).map(key => ({ name: key, revenue: revenueMap[key] }));

        // Generate bar chart data for hotel distribution by rating
        const barChartData = ratingData.map(item => ({
            name: item.name,
            count: item.count
        }));

        // 'entry' refers to each data point in the ratingData array
        // 'index' refers to the index of each entry in the array
        // 'error' is a variable that holds error messages (defined in state)
        return { total, avgRating, ratingData, revenueData, barChartData };
    }, [hotels]);

    // --- Handlers ---
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFormData(prev => ({
                ...prev,
                files: Array.from(e.target.files || [])
            }));
        }
    };

    const openModal = (hotel?: Hotel) => {
        if (hotel) {
            setEditingId(hotel._id);
            setFormData({
                name: hotel.name,
                address: hotel.address,
                description: hotel.description,
                rating: hotel.rating.toString(),
                amenities: hotel.amenities ? hotel.amenities.join(', ') : '',
                phone: hotel.contactInfo?.phone || '',
                email: hotel.contactInfo?.email || '',
                website: hotel.contactInfo?.website || '',
                files: []
            });
        } else {
            setEditingId(null);
            setFormData({
                name: '', address: '', description: '', rating: '0', amenities: '',
                phone: '', email: '', website: '', files: []
            });
        }
        setActiveTab('general');
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);

            // Create FormData
            const form = new FormData();
            form.append('name', formData.name);
            form.append('address', formData.address);
            form.append('description', formData.description);
            form.append('rating', formData.rating);

            // Amenities - send as JSON string if complex, or just string. 
            // The backend handles both. Sending as string since backend splits it.
            // Actually implementation plan says backend splits.
            form.append('amenities', formData.amenities);

            // Contact Info - key structure
            const contactInfo = {
                phone: formData.phone,
                email: formData.email,
                website: formData.website
            };
            form.append('contactInfo', JSON.stringify(contactInfo));

            // Append files
            if (formData.files) {
                formData.files.forEach(file => {
                    form.append('photos', file);
                });
            }

            let res;
            if (editingId) {
                res = await api.put(`/api/hotels/${editingId}`, form);
            } else {
                res = await api.post('/api/hotels', form);
            }

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Operation failed');

            setShowModal(false);
            fetchHotels();
        } catch (err: any) {
            alert(err.message || 'Operation failed');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this hotel?')) {
            try {
                const res = await api.delete(`/api/hotels/${id}`);
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || 'Failed to delete');
                fetchHotels();
            } catch (err: any) {
                alert(err.message || 'Failed to delete');
            }
        }
    };

    // --- Helper: Star Rating ---
    const renderStars = (rating: number) => {
        return (
            <div className="flex text-yellow-400 text-sm">
                {Array.from({ length: 5 }, (_, i) => (
                    <BsStarFill key={i} className={i < Math.round(rating) ? 'opacity-100' : 'opacity-30'} />
                ))}
            </div>
        );
    };

    return (
        <AdminLayout>
            {/* --- HERO HEADER --- */}
            <div className="relative bg-gradient-to-r from-[#5D4037] to-[#8D6E63] text-[#F9F7F2] px-8 py-10 shadow-lg mb-8 overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-10 -mb-10 pointer-events-none"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6 max-w-7xl mx-auto">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-inner">
                                <BsBuilding className="text-3xl text-[#E6E2D3]" />
                            </div>
                            <h1 className="text-4xl font-serif font-bold tracking-tight">Hotel Management</h1>
                        </div>
                        <p className="text-[#E6E2D3] text-lg font-light max-w-xl">
                            Configure hotel details, locations, and amenities.
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <button onClick={() => window.history.back()} className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 rounded-full transition-all duration-300 font-semibold cursor-pointer">
                            <BsArrowLeft /> Back
                        </button>
                        <button onClick={() => openModal()} className="flex items-center gap-2 px-6 py-3 bg-[#E6E2D3] text-[#5D4037] hover:bg-white hover:shadow-xl rounded-full transition-all duration-300 font-bold shadow-lg transform hover:-translate-y-1 cursor-pointer">
                            <BsPlusCircle /> Add Hotel
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 pb-12">

                {/* --- ERROR MESSAGE --- */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl">
                        <p>{error}</p>
                        <button
                            onClick={() => setError(null)}
                            className="mt-2 text-red-500 hover:text-red-700 text-sm font-semibold"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                {/* --- KPI STATS CARDS --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    {[
                        { label: 'Total Hotels', value: metrics.total, icon: BsBuilding, color: 'text-blue-600', bg: 'bg-blue-50' },
                        { label: 'Avg. Rating', value: `${metrics.avgRating}/5`, icon: BsStarFill, color: 'text-yellow-600', bg: 'bg-yellow-50' },
                        { label: 'Total Revenue', value: `$${Math.floor(Math.random() * 10000).toLocaleString()}`, icon: BsCurrencyDollar, color: 'text-[#8D6E63]', bg: 'bg-[#FDFBF7]' },
                        { label: 'Top Rated', value: hotels.length > 0 ? Math.max(...hotels.map(h => h.rating)).toFixed(1) : '0', icon: BsTrophy, color: 'text-green-600', bg: 'bg-green-50' },
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

                {/* --- TOOLBAR --- */}
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
                                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-300 cursor-pointer ${viewMode === tab.id
                                    ? 'bg-[#5D4037] text-white shadow-md'
                                    : 'text-gray-500 hover:text-[#5D4037] hover:bg-gray-100'
                                    }`}
                            >
                                <tab.icon /> {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="relative group w-full lg:w-96">
                        <BsSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#8D6E63] transition-colors" />
                        <input
                            type="text"
                            placeholder="Search by name or address..."
                            className="pl-10 pr-4 py-2.5 w-full bg-[#F9F7F2] border border-[#E6E2D3] rounded-xl focus:ring-2 focus:ring-[#8D6E63] focus:outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* --- MAIN CONTENT AREA --- */}
                {loading ? (
                    <div className="flex justify-center py-20 text-[#8D6E63]">
                        <span className="animate-pulse font-serif text-xl">Loading hotels...</span>
                    </div>
                ) : (
                    <>
                        {/* VIEW: OVERVIEW */}
                        {viewMode === 'overview' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E6E2D3]">
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
                                        <BsCalendarCheck className="text-[#8D6E63]" /> Rating Distribution
                                    </h3>
                                    <div className="h-[350px] flex items-center justify-center">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={metrics.ratingData} innerRadius={80} outerRadius={110} paddingAngle={5} dataKey="count">
                                                    {metrics.ratingData.map((_, index) => (
                                                        <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} stroke="none" />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                                <Legend verticalAlign="bottom" height={36} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E6E2D3]">
                                    <h3 className="text-xl font-serif font-bold text-[#5D4037] mb-6 flex items-center gap-2">
                                        <BsBarChart className="text-[#8D6E63]" /> Rating Bar Chart
                                    </h3>
                                    <div className="h-[350px] flex items-center justify-center">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={metrics.barChartData}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6E2D3" />
                                                <XAxis dataKey="name" stroke="#5D4037" fontSize={12} tickLine={false} axisLine={false} />
                                                <YAxis stroke="#5D4037" fontSize={12} tickLine={false} axisLine={false} />
                                                <Tooltip contentStyle={{ backgroundColor: '#F9F7F2', borderRadius: '12px', border: 'none' }} />
                                                <Bar dataKey="count" fill="#8D6E63" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* VIEW: GRID */}
                        {viewMode === 'grid' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                                {currentHotels.map((hotel) => (
                                    <div key={hotel._id} className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-[#E6E2D3] overflow-hidden flex flex-col h-full">
                                        <div className="relative h-48 bg-gray-200 overflow-hidden">
                                            {hotel.photos && hotel.photos.length > 0 ? (
                                                <img src={hotel.photos[0]} alt={hotel.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-gray-400">
                                                    <BsImages size={32} />
                                                </div>
                                            )}
                                            <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1">
                                                <BsStarFill className="text-yellow-400" /> {hotel.rating}
                                            </div>
                                        </div>

                                        <div className="p-6 flex-1 flex flex-col">
                                            <h4 className="text-xl font-bold text-[#5D4037] mb-2 font-serif">{hotel.name}</h4>

                                            <div className="flex items-start gap-2 text-sm text-gray-500 mb-4">
                                                <BsGeoAlt className="mt-1 shrink-0" />
                                                <span className="line-clamp-2">{hotel.address}</span>
                                            </div>

                                            <p className="text-sm text-gray-600 mb-4 line-clamp-3 flex-1">
                                                {hotel.description}
                                            </p>

                                            <div className="flex flex-wrap gap-2 mb-6">
                                                {hotel.amenities.slice(0, 3).map((amenity, i) => (
                                                    <span key={i} className="px-2 py-1 bg-[#F9F7F2] border border-[#E6E2D3] rounded-md text-xs text-[#5D4037]">
                                                        {amenity}
                                                    </span>
                                                ))}
                                                {hotel.amenities.length > 3 && (
                                                    <span className="px-2 py-1 text-xs text-gray-400">+{hotel.amenities.length - 3} more</span>
                                                )}
                                            </div>

                                            <div className="flex justify-between items-center pt-4 border-t border-dashed border-[#E6E2D3]">
                                                <div className="flex gap-2">
                                                    <button onClick={() => openModal(hotel)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer" title="Edit">
                                                        <BsPencil />
                                                    </button>
                                                    <button onClick={() => handleDelete(hotel._id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer" title="Delete">
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
                                                <th className="p-5 font-bold border-b border-[#E6E2D3]">Hotel Name</th>
                                                <th className="p-5 font-bold border-b border-[#E6E2D3]">Location</th>
                                                <th className="p-5 font-bold border-b border-[#E6E2D3]">Rating</th>
                                                <th className="p-5 font-bold border-b border-[#E6E2D3]">Contact</th>
                                                <th className="p-5 font-bold border-b border-[#E6E2D3] text-center">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#E6E2D3]">
                                            {currentHotels.map((hotel) => (
                                                <tr key={hotel._id} className="hover:bg-[#FDFBF7] transition-colors">
                                                    <td className="p-5">
                                                        <div className="font-bold text-[#5D4037]">{hotel.name}</div>
                                                    </td>
                                                    <td className="p-5 text-sm text-gray-600 max-w-xs truncate">
                                                        {hotel.address}
                                                    </td>
                                                    <td className="p-5">
                                                        {renderStars(hotel.rating)}
                                                    </td>
                                                    <td className="p-5 text-sm">
                                                        <div className="flex flex-col gap-1">
                                                            {hotel.contactInfo?.phone && <span className="flex items-center gap-1"><BsTelephone size={10} /> {hotel.contactInfo.phone}</span>}
                                                            {hotel.contactInfo?.email && <span className="text-gray-500">{hotel.contactInfo.email}</span>}
                                                        </div>
                                                    </td>
                                                    <td className="p-5 text-center">
                                                        <div className="flex justify-center gap-2">
                                                            <button onClick={() => openModal(hotel)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer">
                                                                <BsPencil />
                                                            </button>
                                                            <button onClick={() => handleDelete(hotel._id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer">
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

                        {/* PAGINATION */}
                        {filteredHotels.length > 0 && (
                            <div className="flex flex-col md:flex-row justify-between items-center p-6 bg-white border border-[#E6E2D3] rounded-2xl shadow-sm mt-8">
                                <div className="text-sm text-[#5D4037] mb-4 md:mb-0">
                                    Showing <span className="font-bold">{indexOfFirstItem + 1}</span> to <span className="font-bold">{Math.min(indexOfLastItem, filteredHotels.length)}</span> of <span className="font-bold">{filteredHotels.length}</span> entries
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded-lg border border-[#E6E2D3] text-[#5D4037] hover:bg-[#F9F7F2] disabled:opacity-50 transition-colors"
                                    >
                                        <BsChevronLeft />
                                    </button>
                                    <div className="flex gap-1">
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                                            <button
                                                key={num}
                                                onClick={() => setCurrentPage(num)}
                                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${currentPage === num ? 'bg-[#5D4037] text-white shadow-md' : 'bg-white border border-[#E6E2D3] text-[#5D4037] hover:bg-[#F9F7F2]'
                                                    }`}
                                            >
                                                {num}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="p-2 rounded-lg border border-[#E6E2D3] text-[#5D4037] hover:bg-[#F9F7F2] disabled:opacity-50 transition-colors"
                                    >
                                        <BsChevronRight />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* --- MODAL FORM --- */}
            {showModal && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-[#2C2416]/70 backdrop-blur-md">
                    <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up border border-[#E6E2D3] dark:border-gray-700 flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-[#5D4037] to-[#8D6E63] p-6 text-white flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                                    <BsBuilding size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-serif font-bold tracking-wide">{editingId ? 'Edit Hotel' : 'New Hotel'}</h2>
                                    <p className="text-white/80 text-sm font-light">Manage your property details and settings</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-sm cursor-pointer"
                            >
                                <BsX size={24} />
                            </button>
                        </div>

                        <div className="flex flex-1 overflow-hidden">
                            {/* Sidebar Tabs */}
                            <div className="w-64 bg-[#F9F7F2] dark:bg-[#121212] border-r border-[#E6E2D3] dark:border-gray-800 p-6 space-y-2 shrink-0 hidden md:block">
                                {[
                                    { id: 'general', label: 'General Info', icon: BsInfoCircle },
                                    { id: 'details', label: 'Amenities & Rating', icon: BsStarFill },
                                    { id: 'contact', label: 'Contact Details', icon: BsTelephone },
                                    { id: 'media', label: 'Photos & Media', icon: BsImages },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-300 cursor-pointer ${activeTab === tab.id
                                            ? 'bg-[#5D4037] text-white shadow-lg shadow-[#5D4037]/20 translate-x-1'
                                            : 'text-[#6B5B4F] dark:text-gray-400 hover:bg-white dark:hover:bg-[#1E1E1E] hover:text-[#5D4037] dark:hover:text-[#FDF8F3]'
                                            }`}
                                    >
                                        <tab.icon className={activeTab === tab.id ? 'text-[#D4AF37]' : ''} />
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Main Form Area */}
                            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#1E1E1E]">
                                <div className="flex-1 overflow-y-auto p-8">
                                    {/* Mobile Tabs (Visible only on small screens) */}
                                    <div className="md:hidden flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none">
                                        {[
                                            { id: 'general', label: 'General' },
                                            { id: 'details', label: 'Details' },
                                            { id: 'contact', label: 'Contact' },
                                            { id: 'media', label: 'Media' },
                                        ].map((tab) => (
                                            <button
                                                key={tab.id}
                                                type="button"
                                                onClick={() => setActiveTab(tab.id as any)}
                                                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${activeTab === tab.id
                                                    ? 'bg-[#5D4037] text-white'
                                                    : 'bg-[#F9F7F2] text-[#6B5B4F]'
                                                    }`}
                                            >
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* TAB CONTENT: GENERAL */}
                                    {activeTab === 'general' && (
                                        <div className="space-y-6 animate-fade-in">
                                            <div className="space-y-4">
                                                <h3 className="text-xl font-serif font-bold text-[#5D4037] dark:text-[#FDF8F3] border-b border-[#E6E2D3] dark:border-gray-800 pb-2">
                                                    Basic Information
                                                </h3>
                                                <div className="grid gap-6">
                                                    <div>
                                                        <label className="block text-xs font-bold text-[#6B5B4F] dark:text-gray-400 uppercase tracking-wider mb-2">Hotel Name</label>
                                                        <input
                                                            type="text"
                                                            name="name"
                                                            value={formData.name}
                                                            onChange={handleInputChange}
                                                            placeholder="e.g. Grand Vista Hotel"
                                                            className="w-full px-4 py-3 bg-[#F9F7F2] dark:bg-[#121212] border border-[#E6E2D3] dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#8D6E63] outline-none text-[#2C2416] dark:text-[#FDF8F3] placeholder-gray-400 transition-all font-medium"
                                                            required
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-[#6B5B4F] dark:text-gray-400 uppercase tracking-wider mb-2">Address</label>
                                                        <div className="relative">
                                                            <BsGeoAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                                            <input
                                                                type="text"
                                                                name="address"
                                                                value={formData.address}
                                                                onChange={handleInputChange}
                                                                placeholder="Full property address"
                                                                className="w-full pl-10 pr-4 py-3 bg-[#F9F7F2] dark:bg-[#121212] border border-[#E6E2D3] dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#8D6E63] outline-none text-[#2C2416] dark:text-[#FDF8F3] transition-all font-medium"
                                                                required
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-[#6B5B4F] dark:text-gray-400 uppercase tracking-wider mb-2">Description</label>
                                                        <textarea
                                                            name="description"
                                                            value={formData.description}
                                                            onChange={handleInputChange}
                                                            rows={5}
                                                            placeholder="Describe the property..."
                                                            className="w-full px-4 py-3 bg-[#F9F7F2] dark:bg-[#121212] border border-[#E6E2D3] dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#8D6E63] outline-none text-[#2C2416] dark:text-[#FDF8F3] transition-all resize-none font-medium"
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* TAB CONTENT: DETAILS */}
                                    {activeTab === 'details' && (
                                        <div className="space-y-6 animate-fade-in">
                                            <h3 className="text-xl font-serif font-bold text-[#5D4037] dark:text-[#FDF8F3] border-b border-[#E6E2D3] dark:border-gray-800 pb-2">
                                                Property Details
                                            </h3>
                                            <div className="grid gap-6">
                                                <div>
                                                    <label className="block text-xs font-bold text-[#6B5B4F] dark:text-gray-400 uppercase tracking-wider mb-2">Star Rating (0-5)</label>
                                                    <div className="flex items-center gap-4">
                                                        <input
                                                            type="number"
                                                            name="rating"
                                                            min="0"
                                                            max="5"
                                                            step="0.1"
                                                            value={formData.rating}
                                                            onChange={handleInputChange}
                                                            className="w-32 px-4 py-3 bg-[#F9F7F2] dark:bg-[#121212] border border-[#E6E2D3] dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#8D6E63] outline-none text-[#2C2416] dark:text-[#FDF8F3] font-bold text-lg text-center"
                                                            required
                                                        />
                                                        <div className="flex text-yellow-400 text-xl gap-1">
                                                            {Array.from({ length: 5 }, (_, i) => (
                                                                <BsStarFill key={i} className={i < Math.round(parseFloat(formData.rating)) ? 'opacity-100' : 'opacity-30'} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-[#6B5B4F] dark:text-gray-400 uppercase tracking-wider mb-2">Amenities</label>
                                                    <div className="relative">
                                                        <BsWifi className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                                        <input
                                                            type="text"
                                                            name="amenities"
                                                            placeholder="Swimming Pool, Spa, Gym, Free Wifi..."
                                                            value={formData.amenities}
                                                            onChange={handleInputChange}
                                                            className="w-full pl-10 pr-4 py-3 bg-[#F9F7F2] dark:bg-[#121212] border border-[#E6E2D3] dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#8D6E63] outline-none text-[#2C2416] dark:text-[#FDF8F3] font-medium"
                                                        />
                                                    </div>
                                                    <p className="text-xs text-[#8D6E63] mt-2 flex items-center gap-1">
                                                        <BsInfoCircle /> Separate amenities with commas
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* TAB CONTENT: CONTACT */}
                                    {activeTab === 'contact' && (
                                        <div className="space-y-6 animate-fade-in">
                                            <h3 className="text-xl font-serif font-bold text-[#5D4037] dark:text-[#FDF8F3] border-b border-[#E6E2D3] dark:border-gray-800 pb-2">
                                                Contact Information
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-xs font-bold text-[#6B5B4F] dark:text-gray-400 uppercase tracking-wider mb-2">Phone Number</label>
                                                    <div className="relative">
                                                        <BsPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                                        <input
                                                            type="tel"
                                                            name="phone"
                                                            value={formData.phone}
                                                            onChange={handleInputChange}
                                                            className="w-full pl-10 pr-4 py-3 bg-[#F9F7F2] dark:bg-[#121212] border border-[#E6E2D3] dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#8D6E63] outline-none text-[#2C2416] dark:text-[#FDF8F3] font-medium"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-[#6B5B4F] dark:text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
                                                    <input
                                                        type="email"
                                                        name="email"
                                                        value={formData.email}
                                                        onChange={handleInputChange}
                                                        className="w-full px-4 py-3 bg-[#F9F7F2] dark:bg-[#121212] border border-[#E6E2D3] dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#8D6E63] outline-none text-[#2C2416] dark:text-[#FDF8F3] font-medium"
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="block text-xs font-bold text-[#6B5B4F] dark:text-gray-400 uppercase tracking-wider mb-2">Website</label>
                                                    <input
                                                        type="url"
                                                        name="website"
                                                        value={formData.website}
                                                        onChange={handleInputChange}
                                                        className="w-full px-4 py-3 bg-[#F9F7F2] dark:bg-[#121212] border border-[#E6E2D3] dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#8D6E63] outline-none text-[#2C2416] dark:text-[#FDF8F3] font-medium"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* TAB CONTENT: MEDIA */}
                                    {activeTab === 'media' && (
                                        <div className="space-y-6 animate-fade-in">
                                            <h3 className="text-xl font-serif font-bold text-[#5D4037] dark:text-[#FDF8F3] border-b border-[#E6E2D3] dark:border-gray-800 pb-2">
                                                Gallery & Photos
                                            </h3>

                                            <div className="w-full aspect-video rounded-2xl border-2 border-dashed border-[#E6E2D3] dark:border-gray-700 bg-[#F9F7F2] dark:bg-[#121212] flex flex-col items-center justify-center relative group hover:border-[#8D6E63] transition-colors cursor-pointer">
                                                <input
                                                    type="file"
                                                    multiple
                                                    accept="image/*"
                                                    onChange={handleFileChange}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                />
                                                <div className="p-4 rounded-full bg-white dark:bg-[#2C2416] shadow-sm mb-4 group-hover:scale-110 transition-transform">
                                                    <BsCloudUpload className="text-3xl text-[#8D6E63]" />
                                                </div>
                                                <h4 className="text-lg font-bold text-[#5D4037] dark:text-[#FDF8F3]">Click to upload photos</h4>
                                                <p className="text-sm text-[#6B5B4F] dark:text-gray-400 mt-2">SVG, PNG, JPG or GIF (max. 5MB)</p>
                                            </div>

                                            {formData.files.length > 0 && (
                                                <div className="space-y-2">
                                                    <p className="text-sm font-bold text-[#5D4037]">{formData.files.length} files selected</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {formData.files.map((file, i) => (
                                                            <div key={i} className="px-3 py-1 bg-[#E6E2D3] rounded-md text-xs text-[#5D4037]">
                                                                {file.name}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
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
                                        {loading ? 'Processing...' : (editingId ? 'Save Changes' : 'Create Hotel')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};


export default ManageHotels;