import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { api } from '../../utils/api';
import { payForBooking, outcomeMessage } from '../../utils/payhere';
import { printReceipt } from '../../utils/receipt';
// NEW IMPORTS
import { motion, AnimatePresence } from 'framer-motion';
import {
    BsCalendarCheck, BsClockHistory, BsXCircle, BsFileText,
    BsGeoAlt, BsGear, BsStars
} from 'react-icons/bs';
import { toast, confirmDialog, Badge, statusTone } from '../../components/ui';
import { Link } from 'react-router-dom';
import { formatMoney, nightsBetween, statusLabel, type PriceQuote } from '../../utils/booking';

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
    roomNumber?: string;
    hotel?: { name?: string } | string;
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
    confirmationCode?: string;
    guests?: number;
    pricing?: PriceQuote;
    refund?: { status?: 'due' | 'completed'; amount?: number };
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
    const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
    const [requestForm, setRequestForm] = useState<{ type: 'cleaning' | 'food' | 'repair'; notes: string }>({ type: 'cleaning', notes: '' });
    const [requestStatus, setRequestStatus] = useState<{ sending: boolean; error: string; done: boolean }>({ sending: false, error: '', done: false });

    const submitServiceRequest = async () => {
        const booking = bookings.find(b => b._id === selectedBookingId);
        const roomId = booking && typeof booking.room === 'object' ? booking.room?._id : (booking?.room as unknown as string | undefined);
        if (!roomId) return;
        setRequestStatus({ sending: true, error: '', done: false });
        try {
            const res = await api.post('/api/service-requests', { room: roomId, type: requestForm.type, notes: requestForm.notes.trim() });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || 'Could not send your request');
            setRequestStatus({ sending: false, error: '', done: true });
            setRequestForm({ type: 'cleaning', notes: '' });
            fetchServiceRequests();
        } catch (err: unknown) {
            setRequestStatus({ sending: false, error: err instanceof Error ? err.message : 'Could not send your request', done: false });
        }
    };

    const closeRequestModal = () => {
        setShowRequestModal(false);
        setRequestStatus({ sending: false, error: '', done: false });
    };

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

    const [cancellingId, setCancellingId] = useState<string | null>(null);
    const [payingId, setPayingId] = useState<string | null>(null);

    const handlePayNow = async (bookingId: string) => {
        setPayingId(bookingId);
        try {
            const outcome = await payForBooking(bookingId);
            toast[outcome === 'dismissed' ? 'warning' : 'success'](outcomeMessage(outcome));
            await fetchMyBookings();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Could not start payment');
        } finally {
            setPayingId(null);
        }
    };

    const handleCancelBooking = async (bookingId: string) => {
        if (!(await confirmDialog({ title: 'Cancel this booking?', message: 'Your room will be released. If you have already paid, our team will process your refund. This cannot be undone.', confirmLabel: 'Cancel booking', cancelLabel: 'Keep booking', tone: 'danger' }))) return;
        setCancellingId(bookingId);
        try {
            const res = await api.request(`/api/bookings/${bookingId}/cancel`, { method: 'PATCH' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || 'Could not cancel booking');
            toast.success(data.message || 'Booking cancelled.');
            await fetchMyBookings();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Could not cancel booking');
        } finally {
            setCancellingId(null);
        }
    };

    useEffect(() => {
        fetchMyBookings();
        if (isAuthenticated()) {
            fetchServiceRequests();
        }
        // Load once on mount; the fetchers only read state setters
        // eslint-disable-next-line react-hooks/exhaustive-deps
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


    // Real numbers from the guest's own bookings
    const stats = useMemo(() => {
        const active = bookings.filter(b => b.status !== 'cancelled');
        return {
            completed: bookings.filter(b => b.status === 'checked_out').length,
            upcomingCount: active.filter(b => new Date(b.checkOutDate || '') >= new Date()).length,
            nights: active.reduce((sum, b) => sum + nightsBetween(b.checkInDate, b.checkOutDate), 0),
        };
    }, [bookings]);






    return (
        <div className="bg-ivory min-h-screen font-sans selection:bg-bronze selection:text-white dark:bg-night dark:text-cream transition-colors duration-300">
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
                        className="text-[0.85rem] font-semibold tracking-[0.18em] uppercase text-sand mb-2 mt-10 dark:text-[#A8A29E]"
                        variants={fadeInUp}
                    >
                        Your Stays at a Glance
                    </motion.p>
                    <motion.h1
                        className="text-3xl md:text-4xl lg:text-[3.2rem] font-semibold mb-4 dark:text-cream"
                        style={{ fontFamily: 'Playfair Display, serif' }}
                        variants={fadeInUp}
                    >
                        Your Bookings &amp; Requests
                    </motion.h1>
                    <motion.p
                        className="max-w-xl text-[0.98rem] leading-7 text-cream mb-6 dark:text-gray-300"
                        variants={fadeInUp}
                    >
                        View upcoming reservations, revisit past stays, and keep every detail
                        of your HotelMania experiences in one elegant place.
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
                    className="mx-auto max-w-5xl rounded-xl bg-white p-6 shadow-xl border border-ivory grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 dark:bg-[#0f0f0f] dark:border-gray-700"
                >
                    <div className="flex items-center gap-4 border-b md:border-b-0 md:border-r border-ivory pb-4 md:pb-0">
                        <div className="p-3 bg-ivory rounded-full text-bronze dark:bg-gray-700 dark:text-gold"><BsStars size={24} /></div>
                        <div>
                            <p className="text-xs uppercase tracking-widest text-bronze font-bold dark:text-gold">Completed stays</p>
                            <p className="font-serif text-xl text-ink dark:text-cream">{stats.completed}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 border-b md:border-b-0 md:border-r border-ivory pb-4 md:pb-0">
                        <div className="p-3 bg-ivory rounded-full text-bronze dark:bg-gray-700 dark:text-gold"><BsCalendarCheck size={24} /></div>
                        <div>
                            <p className="text-xs uppercase tracking-widest text-bronze font-bold dark:text-gold">Upcoming</p>
                            <p className="font-serif text-xl text-ink dark:text-cream">{stats.upcomingCount} {stats.upcomingCount === 1 ? 'Stay' : 'Stays'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-ivory rounded-full text-bronze dark:bg-gray-700 dark:text-gold"><BsClockHistory size={24} /></div>
                        <div>
                            <p className="text-xs uppercase tracking-widest text-bronze font-bold dark:text-gold">Total Nights</p>
                            <p className="font-serif text-xl text-ink dark:text-cream">{stats.nights} {stats.nights === 1 ? 'Night' : 'Nights'}</p>
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
                            onClick={() => setActiveTab(tab.id as typeof activeTab)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold uppercase tracking-wider transition-all duration-300 ${activeTab === tab.id
                                    ? 'bg-bronze text-white shadow-lg transform scale-105 dark:bg-gold dark:text-ink'
                                    : 'bg-white text-taupe hover:bg-ivory dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                                }`}
                        >
                            <tab.icon /> {tab.label}
                        </button>
                    ))}
                </motion.div>

                {/* 3. BOOKING LIST */}
                <div className="mx-auto max-w-5xl">
                    {status.loading ? (
                        <div className="flex justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-2 border-bronze border-t-transparent" /></div>
                    ) : filteredBookings.length === 0 ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 bg-white rounded-xl shadow-sm dark:bg-gray-800 dark:text-cream">
                            <p className="font-serif text-2xl text-ink mb-2 dark:text-cream">No bookings found</p>
                            <p className="text-taupe dark:text-gray-300">You have no {activeTab} stays recorded.</p>
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
                                        className="group relative overflow-hidden rounded-xl bg-white shadow-sm transition-all hover:shadow-md border border-ivory dark:bg-gray-800 dark:border-gray-700"
                                    >
                                        <div className="flex flex-col md:flex-row">
                                            {/* Left: Date Block */}
                                            <div className="bg-ink p-6 flex flex-col justify-center items-center text-white min-w-[140px] dark:bg-gray-900 dark:text-cream">
                                                <span className="text-3xl font-serif">
                                                    {new Date(booking.checkInDate || '').getUTCDate()}
                                                </span>
                                                <span className="text-sm uppercase tracking-widest opacity-80">
                                                    {new Date(booking.checkInDate || '').toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' })}
                                                </span>
                                                <div className="w-8 h-[1px] bg-white/30 my-3 dark:bg-gray-500"></div>
                                                <span className="text-xs opacity-60">
                                                    {new Date(booking.checkInDate || '').getUTCFullYear()}
                                                </span>
                                            </div>

                                            {/* Middle: Info */}
                                            <div className="p-6 flex-1 dark:text-cream">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h3 className="font-serif text-2xl text-ink dark:text-cream">
                                                        {typeof booking.room === 'object' ? (typeof booking.room.type === 'object' ? booking.room.type?.name : undefined) || 'Luxury Room' : 'Luxury Room'}
                                                    </h3>
                                                    <Badge tone={statusTone(booking.status)}>{statusLabel(booking.status)}</Badge>
                                                </div>

                                                <p className="text-taupe mb-1 text-sm flex flex-wrap items-center gap-x-3 gap-y-1 dark:text-gray-300">
                                                    {booking.confirmationCode && <span className="font-mono font-semibold tracking-wider text-ink dark:text-cream">{booking.confirmationCode}</span>}
                                                    <span className="flex items-center gap-1.5">
                                                        <BsGeoAlt />
                                                        {typeof booking.room === 'object' && typeof booking.room.hotel === 'object' && booking.room.hotel?.name ? `${booking.room.hotel.name} · ` : ''}
                                                        {booking.status === 'checked_in' && typeof booking.room === 'object' && booking.room.roomNumber
                                                            ? `Room ${booking.room.roomNumber}`
                                                            : `${nightsBetween(booking.checkInDate, booking.checkOutDate)} night${nightsBetween(booking.checkInDate, booking.checkOutDate) === 1 ? '' : 's'} · ${booking.guests || 1} guest${(booking.guests || 1) === 1 ? '' : 's'}`}
                                                    </span>
                                                </p>
                                                {booking.refund?.status && (
                                                    <p className="mb-2 text-sm text-info">
                                                        {booking.refund.status === 'due' ? 'Refund being processed' : 'Refund sent'}: {formatMoney(booking.refund.amount, booking.pricing?.currency)}
                                                    </p>
                                                )}

                                                <div className="flex flex-wrap gap-4 mt-6">
                                                    {/* Action Buttons */}
                                                    {booking._id && (
                                                        <Link
                                                            to={`/booking/${booking._id}`}
                                                            className="flex items-center gap-2 px-4 py-2 rounded text-xs font-bold uppercase bg-ink text-white hover:bg-cocoa transition-colors dark:bg-cream dark:text-ink"
                                                        >
                                                            View details
                                                        </Link>
                                                    )}
                                                    <button
                                                        onClick={() => printReceipt(booking as Parameters<typeof printReceipt>[0])}
                                                        className="flex items-center gap-2 px-4 py-2 border border-stone rounded text-xs font-bold uppercase text-bronze hover:bg-bronze hover:text-white transition-colors dark:border-gray-600 dark:text-gold dark:hover:bg-gold dark:hover:text-ink"
                                                    >
                                                        <BsFileText /> Receipt
                                                    </button>
                                                    {activeTab === 'upcoming' &&
                                                        (booking.status === 'confirmed' || booking.status === 'checked_in') &&
                                                        new Date(booking.checkInDate || '').getTime() <= Date.now() && (
                                                        <button
                                                            onClick={() => { setSelectedBookingId(booking._id || null); setShowRequestModal(true); }}
                                                            className="flex items-center gap-2 px-4 py-2 border border-stone rounded text-xs font-bold uppercase text-bronze hover:bg-bronze hover:text-white transition-colors dark:border-gray-600 dark:text-gold dark:hover:bg-gold dark:hover:text-ink"
                                                        >
                                                            <BsGear /> Service Request
                                                        </button>
                                                    )}
                                                    {activeTab === 'upcoming' && booking.status === 'pending' && booking.paymentStatus === 'pending' && (
                                                        <button
                                                            onClick={() => booking._id && handlePayNow(booking._id)}
                                                            disabled={payingId === booking._id}
                                                            className="flex items-center gap-2 px-4 py-2 rounded text-xs font-bold uppercase bg-bronze text-white hover:bg-cocoa transition-colors disabled:opacity-50 dark:bg-gold dark:text-ink"
                                                        >
                                                            {payingId === booking._id ? 'Opening PayHere…' : 'Pay Now'}
                                                        </button>
                                                    )}
                                                    {activeTab === 'upcoming' &&
                                                        (booking.status === 'pending' || booking.status === 'confirmed') &&
                                                        new Date(booking.checkInDate || '').getTime() > Date.now() && (
                                                        <button
                                                            onClick={() => booking._id && handleCancelBooking(booking._id)}
                                                            disabled={cancellingId === booking._id}
                                                            className="flex items-center gap-2 px-4 py-2 border border-red-200 rounded text-xs font-bold uppercase text-red-700 hover:bg-red-600 hover:text-white transition-colors disabled:opacity-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-700"
                                                        >
                                                            <BsXCircle /> {cancellingId === booking._id ? 'Cancelling…' : 'Cancel Booking'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Right: Price */}
                                            <div className="p-6 bg-ivory flex flex-col justify-center items-end min-w-[150px] text-right dark:bg-gray-700 dark:text-cream">
                                                <p className="text-xs uppercase tracking-widest text-bronze mb-1 dark:text-gold">Total</p>
                                                <p className="font-serif text-2xl text-ink dark:text-cream">{formatMoney(booking.totalPrice, booking.pricing?.currency)}</p>
                                                <Badge tone={statusTone(booking.paymentStatus)} className="mt-2">{statusLabel(booking.paymentStatus)}</Badge>
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
                            className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden dark:bg-gray-800 dark:text-cream"
                        >
                            <div className="bg-ink p-4 flex justify-between items-center text-white dark:bg-gray-900 dark:text-cream">
                                <h3 className="font-serif text-xl dark:text-cream">New Service Request</h3>
                                <button onClick={closeRequestModal} aria-label="Close" className="dark:text-cream"><BsXCircle size={20} /></button>
                            </div>
                            <div className="p-6 space-y-4 dark:bg-gray-800">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-bronze mb-2 dark:text-gold">Service Type</label>
                                    <select
                                        value={requestForm.type}
                                        onChange={e => setRequestForm(prev => ({ ...prev, type: e.target.value as 'cleaning' | 'food' | 'repair' }))}
                                        className="w-full p-3 border border-stone rounded bg-ivory outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-cream"
                                    >
                                        <option value="cleaning">Room Cleaning</option>
                                        <option value="food">In-Room Dining</option>
                                        <option value="repair">Maintenance Issue</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-bronze mb-2 dark:text-gold">Notes</label>
                                    <textarea
                                        value={requestForm.notes}
                                        maxLength={500}
                                        onChange={e => setRequestForm(prev => ({ ...prev, notes: e.target.value }))}
                                        className="w-full p-3 border border-stone rounded bg-ivory outline-none h-24 dark:bg-gray-700 dark:border-gray-600 dark:text-cream"
                                        placeholder="Describe your request..."
                                    />
                                </div>
                                {requestStatus.error && (
                                    <p role="alert" className="text-sm text-red-700 dark:text-red-400">{requestStatus.error}</p>
                                )}
                                {requestStatus.done && (
                                    <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">Request sent. Our team will be with you shortly.</p>
                                )}
                                <button
                                    onClick={submitServiceRequest}
                                    disabled={requestStatus.sending}
                                    className="w-full py-3 bg-bronze text-white font-bold uppercase tracking-widest rounded hover:bg-cocoa transition-colors disabled:opacity-50 dark:bg-gold dark:text-ink dark:hover:bg-[#b8952d]"
                                >
                                    {requestStatus.sending ? 'Sending…' : 'Submit Request'}
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
