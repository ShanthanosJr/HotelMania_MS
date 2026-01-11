import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { api } from '../../utils/api';
// NEW IMPORTS
import { motion, AnimatePresence } from 'framer-motion';
import {
    BsCalendarCheck, BsClockHistory, BsXCircle, BsFileText,
    BsGeoAlt, BsGear, BsStars
} from 'react-icons/bs';

const heroImage =
    'https://images.pexels.com/photos/261107/pexels-photo-261107.jpeg?auto=compress&cs=tinysrgb&w=1600';

type BookingUser = {
    name?: string;
};

type BookingRoomType = {
    name?: string;
};

type BookingRoom = {
    _id?: string;
    type?: BookingRoomType | string;
};

type Booking = {
    _id?: string;
    id?: string;
    checkInDate?: string;
    checkOutDate?: string;
    status?: string;
    paymentStatus?: string;
    totalPrice?: number;
    user?: BookingUser;
    room?: BookingRoom;
};

type ServiceRequest = {
    _id?: string;
    type?: 'food' | 'cleaning' | 'repair' | string;
    description?: string;
    status?: string;
    createdAt?: string;
    room?: {
        _id?: string;
    } | string;
};

type StatusState = {
    loading: boolean;
    error: string;
};

const Bookings: React.FC = () => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [, setServiceRequests] = useState<ServiceRequest[]>([]);
    const [status, setStatus] = useState<StatusState>({
        loading: true,
        error: '',
    });

    const fadeInUp = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
    };

    const stagger = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    // NEW STATE FOR TABS & FILTERS
    const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [, setSelectedBookingId] = useState<string | null>(null);

    const [serviceRequestsStatus, setServiceRequestsStatus] =
        useState<StatusState>({
            loading: false,
            error: '',
        });

    const isAuthenticated = () => {
        const token = localStorage.getItem('token');
        return token !== null && token !== undefined && token !== '';
    };

    const fetchMyBookings = async () => {
        try {
            setStatus({ loading: true, error: '' });

            if (!isAuthenticated()) {
                setStatus({
                    loading: false,
                    error: 'You need to sign in to view and manage your bookings.',
                });
                return;
            }

            const response = await api.get('/api/bookings/my-bookings');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    (errorData && errorData.message) ||
                    'Failed to fetch your bookings',
                );
            }

            const data = await response.json();
            if (data.success && Array.isArray(data.data)) {
                setBookings(data.data);
            } else {
                setBookings([]);
            }

            setStatus({ loading: false, error: '' });
        } catch (err: unknown) {
            const message =
                err && typeof err === 'object' && 'message' in err
                    ? String((err as Error).message)
                    : 'Error loading bookings. Please try again.';
            setStatus({ loading: false, error: message });
        }
    };

    const fetchServiceRequests = async () => {
        if (!isAuthenticated()) return;
        try {
            setServiceRequestsStatus({ loading: true, error: '' });

            const response = await api.get('/api/service-requests');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    (errorData && errorData.message) ||
                    'Failed to fetch your service requests',
                );
            }

            const data = await response.json();
            if (data.success && Array.isArray(data.data)) {
                setServiceRequests(data.data);
            }

            setServiceRequestsStatus({ loading: false, error: '' });
        } catch (err: unknown) {
            const message =
                err && typeof err === 'object' && 'message' in err
                    ? String((err as Error).message)
                    : 'Error loading service requests';
            setServiceRequestsStatus({ loading: false, error: message });
        }
    };

    useEffect(() => {
        fetchMyBookings();
        if (isAuthenticated()) {
            fetchServiceRequests();
        }
    }, []);

    // NEW: Smart Filtering Logic
    const filteredBookings = useMemo(() => {
        const now = new Date();
        return bookings.filter(b => {
            const checkOut = new Date(b.checkOutDate || '');
            const isCancelled = b.status === 'cancelled';

            if (activeTab === 'cancelled') return isCancelled;
            if (activeTab === 'past') return checkOut < now && !isCancelled;
            if (activeTab === 'upcoming') return checkOut >= now && !isCancelled;
            return false;
        });
    }, [bookings, activeTab]);

    // Keep original upcoming and past for active booking


    // NEW: Mock Loyalty Stats (You can calculate real ones later)
    const stats = {
        nights: bookings.length * 3, // Mock calculation
        upcomingCount: bookings.filter(b => new Date(b.checkOutDate || '') >= new Date()).length,
        status: "Gold Member"
    };



    const formatStatus = (value?: string) =>
        value ? value.charAt(0).toUpperCase() + value.slice(1) : '';





    return (
        <div className="bg-[#FDF8F3] min-h-screen font-sans selection:bg-[#8B6914] selection:text-white dark:bg-[#121212] dark:text-[#F5F0E6] transition-colors duration-300">
            <Navbar />

            {/* HERO */}
            <section className="relative min-h-[480px] relative overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center scale-[1.08] animate-[roomsHeroZoom_18s_ease-in-out_infinite_alternate]"
                    style={{ backgroundImage: `url(${heroImage})` }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(125deg,rgba(44,36,22,0.9)_0%,rgba(139,105,20,0.82)_45%,rgba(184,212,227,0.25)_100%)]" />
                <motion.div
                    className="relative z-10 max-w-[1400px] mx-auto px-6 py-24 text-white mt-10"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={stagger}
                >
                    <motion.p
                        className="text-[0.85rem] font-semibold tracking-[0.18em] uppercase text-[#E8DCC8] mb-2 mt-10 dark:text-[#A8A29E]"
                        variants={fadeInUp}
                    >
                        Your Stays at a Glance
                    </motion.p>
                    <motion.h1
                        className="text-3xl md:text-4xl lg:text-[3.2rem] font-semibold mb-4 dark:text-[#F5F0E6]"
                        style={{ fontFamily: 'Playfair Display, serif' }}
                        variants={fadeInUp}
                    >
                        Your Bookings &amp; Requests
                    </motion.h1>
                    <motion.p
                        className="max-w-xl text-[0.98rem] leading-7 text-[#F5F0E6] mb-6 dark:text-gray-300"
                        variants={fadeInUp}
                    >
                        View upcoming reservations, revisit past stays, and keep every detail
                        of your Grand Vista experiences in one elegant place.
                    </motion.p>
                </motion.div>
            </section>

            <main className="relative z-20 -mt-20 px-6 pb-24">
                {/* 1. LOYALTY STATS BAR (Floating Card) */}
                {/* 1. LOYALTY STATS BAR (Floating Card) */}
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-50px" }}
                    variants={fadeInUp}
                    className="mx-auto max-w-5xl rounded-xl bg-white p-6 shadow-xl border border-[#FDF8F3] grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 dark:bg-[#0f0f0f] dark:border-gray-700"
                >
                    <div className="flex items-center gap-4 border-b md:border-b-0 md:border-r border-[#FDF8F3] pb-4 md:pb-0">
                        <div className="p-3 bg-[#FDF8F3] rounded-full text-[#8B6914] dark:bg-gray-700 dark:text-[#D4AF37]"><BsStars size={24} /></div>
                        <div>
                            <p className="text-xs uppercase tracking-widest text-[#8B6914] font-bold dark:text-[#D4AF37]">Status</p>
                            <p className="font-serif text-xl text-[#2C2416] dark:text-[#F5F0E6]">{stats.status}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 border-b md:border-b-0 md:border-r border-[#FDF8F3] pb-4 md:pb-0">
                        <div className="p-3 bg-[#FDF8F3] rounded-full text-[#8B6914] dark:bg-gray-700 dark:text-[#D4AF37]"><BsCalendarCheck size={24} /></div>
                        <div>
                            <p className="text-xs uppercase tracking-widest text-[#8B6914] font-bold dark:text-[#D4AF37]">Upcoming</p>
                            <p className="font-serif text-xl text-[#2C2416] dark:text-[#F5F0E6]">{stats.upcomingCount} Stays</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-[#FDF8F3] rounded-full text-[#8B6914] dark:bg-gray-700 dark:text-[#D4AF37]"><BsClockHistory size={24} /></div>
                        <div>
                            <p className="text-xs uppercase tracking-widest text-[#8B6914] font-bold dark:text-[#D4AF37]">Total Nights</p>
                            <p className="font-serif text-xl text-[#2C2416] dark:text-[#F5F0E6]">{stats.nights} Nights</p>
                        </div>
                    </div>
                </motion.div>

                {/* 2. TAB NAVIGATION */}
                {/* 2. TAB NAVIGATION */}
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fadeInUp}
                    className="mx-auto max-w-5xl mb-8 flex justify-center gap-4"
                >
                    {[
                        { id: 'upcoming', label: 'Upcoming', icon: BsCalendarCheck },
                        { id: 'past', label: 'History', icon: BsClockHistory },
                        { id: 'cancelled', label: 'Cancelled', icon: BsXCircle }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold uppercase tracking-wider transition-all duration-300 ${activeTab === tab.id
                                    ? 'bg-[#8B6914] text-white shadow-lg transform scale-105 dark:bg-[#D4AF37] dark:text-[#2C2416]'
                                    : 'bg-white text-[#6B5B4F] hover:bg-[#FDF8F3] dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                                }`}
                        >
                            <tab.icon /> {tab.label}
                        </button>
                    ))}
                </motion.div>

                {/* 3. BOOKING LIST */}
                <div className="mx-auto max-w-5xl">
                    {status.loading ? (
                        <div className="flex justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-2 border-[#8B6914] border-t-transparent" /></div>
                    ) : filteredBookings.length === 0 ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 bg-white rounded-xl shadow-sm dark:bg-gray-800 dark:text-[#F5F0E6]">
                            <p className="font-serif text-2xl text-[#2C2416] mb-2 dark:text-[#F5F0E6]">No bookings found</p>
                            <p className="text-[#6B5B4F] dark:text-gray-300">You have no {activeTab} stays recorded.</p>
                        </motion.div>
                    ) : (
                        <div className="grid gap-6">
                            <AnimatePresence mode='wait'>
                                {filteredBookings.map((booking, index) => (
                                    <motion.div
                                        key={booking._id || index}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="group relative overflow-hidden rounded-xl bg-white shadow-sm transition-all hover:shadow-md border border-[#FDF8F3] dark:bg-gray-800 dark:border-gray-700"
                                    >
                                        <div className="flex flex-col md:flex-row">
                                            {/* Left: Date Block */}
                                            <div className="bg-[#2C2416] p-6 flex flex-col justify-center items-center text-white min-w-[140px] dark:bg-gray-900 dark:text-[#F5F0E6]">
                                                <span className="text-3xl font-serif">
                                                    {new Date(booking.checkInDate || '').getDate()}
                                                </span>
                                                <span className="text-sm uppercase tracking-widest opacity-80">
                                                    {new Date(booking.checkInDate || '').toLocaleString('default', { month: 'short' })}
                                                </span>
                                                <div className="w-8 h-[1px] bg-white/30 my-3 dark:bg-gray-500"></div>
                                                <span className="text-xs opacity-60">
                                                    {new Date(booking.checkInDate || '').getFullYear()}
                                                </span>
                                            </div>

                                            {/* Middle: Info */}
                                            <div className="p-6 flex-1 dark:text-[#F5F0E6]">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h3 className="font-serif text-2xl text-[#2C2416] dark:text-[#F5F0E6]">
                                                        {typeof booking.room === 'object' ? (booking.room.type as any)?.name || 'Luxury Room' : 'Luxury Room'}
                                                    </h3>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${booking.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200' :
                                                            booking.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200' : 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200'
                                                        }`}>
                                                        {formatStatus(booking.status)}
                                                    </span>
                                                </div>

                                                <p className="text-[#6B5B4F] mb-4 text-sm flex items-center gap-2 dark:text-gray-300">
                                                    <BsGeoAlt /> Room {typeof booking.room === 'object' ? (booking.room as any).roomNumber : ''}
                                                </p>

                                                <div className="flex flex-wrap gap-4 mt-6">
                                                    {/* Action Buttons */}
                                                    <button className="flex items-center gap-2 px-4 py-2 border border-[#E6E2D3] rounded text-xs font-bold uppercase text-[#8B6914] hover:bg-[#8B6914] hover:text-white transition-colors dark:border-gray-600 dark:text-[#D4AF37] dark:hover:bg-[#D4AF37] dark:hover:text-[#2C2416]">
                                                        <BsFileText /> Invoice
                                                    </button>
                                                    {activeTab === 'upcoming' && (
                                                        <button
                                                            onClick={() => { setSelectedBookingId(booking._id || null); setShowRequestModal(true); }}
                                                            className="flex items-center gap-2 px-4 py-2 border border-[#E6E2D3] rounded text-xs font-bold uppercase text-[#8B6914] hover:bg-[#8B6914] hover:text-white transition-colors dark:border-gray-600 dark:text-[#D4AF37] dark:hover:bg-[#D4AF37] dark:hover:text-[#2C2416]"
                                                        >
                                                            <BsGear /> Service Request
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Right: Price */}
                                            <div className="p-6 bg-[#FDF8F3] flex flex-col justify-center items-end min-w-[150px] text-right dark:bg-gray-700 dark:text-[#F5F0E6]">
                                                <p className="text-xs uppercase tracking-widest text-[#8B6914] mb-1 dark:text-[#D4AF37]">Total</p>
                                                <p className="font-serif text-2xl text-[#2C2416] dark:text-[#F5F0E6]">${booking.totalPrice}</p>
                                                <p className="text-xs text-[#6B5B4F] mt-1 dark:text-gray-300">{booking.paymentStatus}</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                {/* SERVICE REQUESTS GLOBAL STATUS */}
                {serviceRequestsStatus.error && (
                    <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-900 shadow-sm border border-rose-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800">
                        {serviceRequestsStatus.error}
                    </div>
                )}
            </main>

            {/* 4. SERVICE REQUEST MODAL (Simple UI) */}
            <AnimatePresence>
                {showRequestModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                            className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden dark:bg-gray-800 dark:text-[#F5F0E6]"
                        >
                            <div className="bg-[#2C2416] p-4 flex justify-between items-center text-white dark:bg-gray-900 dark:text-[#F5F0E6]">
                                <h3 className="font-serif text-xl dark:text-[#F5F0E6]">New Service Request</h3>
                                <button onClick={() => setShowRequestModal(false)} className="dark:text-[#F5F0E6]"><BsXCircle size={20} /></button>
                            </div>
                            <div className="p-6 space-y-4 dark:bg-gray-800">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-[#8B6914] mb-2 dark:text-[#D4AF37]">Service Type</label>
                                    <select className="w-full p-3 border border-[#E6E2D3] rounded bg-[#FDF8F3] outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-[#F5F0E6]">
                                        <option>Room Cleaning</option>
                                        <option>In-Room Dining</option>
                                        <option>Maintenance Issue</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-[#8B6914] mb-2 dark:text-[#D4AF37]">Notes</label>
                                    <textarea className="w-full p-3 border border-[#E6E2D3] rounded bg-[#FDF8F3] outline-none h-24 dark:bg-gray-700 dark:border-gray-600 dark:text-[#F5F0E6]" placeholder="Describe your request..."></textarea>
                                </div>
                                <button className="w-full py-3 bg-[#8B6914] text-white font-bold uppercase tracking-widest rounded hover:bg-[#5C4033] transition-colors dark:bg-[#D4AF37] dark:text-[#2C2416] dark:hover:bg-[#b8952d]">
                                    Submit Request
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Footer />
            <style>{`
        @keyframes roomsHeroZoom {
          0% { transform: scale(1.08); }
          100% { transform: scale(1.12); }
        }
      `}</style>
        </div>
    );
};

export default Bookings;
