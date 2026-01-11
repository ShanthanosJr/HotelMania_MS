import React, { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { api } from '../../utils/api';
import alexandraImg from '../../assets/alexandra_reed.png';
import danielImg from '../../assets/daniel_hart.png';
import mayaImg from '../../assets/maya_chen.png';

const heroImage =
    'https://images.pexels.com/photos/189296/pexels-photo-189296.jpeg?auto=compress&cs=tinysrgb&w=1600';

type ReviewForm = {
    room: string;
    rating: string;
    comment: string;
};

type StatusState = {
    sending: boolean;
    success: string;
    error: string;
};

type RoomType = {
    name?: string;
};

type BookingRoom = {
    _id?: string;
    type?: RoomType | string;
};

type Booking = {
    _id?: string;
    id?: string;
    status?: string;
    checkOutDate?: string;
    room?: BookingRoom;
};

type ServiceRequestState = {
    bookingId: string;
    roomId: string;
    type: 'cleaning' | 'food' | 'repair' | string;
};

type HubStatusState = {
    loading: boolean;
    error: string;
    success: string;
};

const Contact: React.FC = () => {
    const [form, setForm] = useState<ReviewForm>({
        room: '',
        rating: '',
        comment: '',
    });
    const [status, setStatus] = useState<StatusState>({
        sending: false,
        success: '',
        error: '',
    });

    const [completedBookings, setCompletedBookings] = useState<Booking[]>([]);

    const [showServiceModal, setShowServiceModal] = useState(false);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [serviceRequest, setServiceRequest] = useState<ServiceRequestState>({
        bookingId: '',
        roomId: '',
        type: 'cleaning',
    });
    const [serviceHubStatus, setServiceHubStatus] = useState<HubStatusState>({
        loading: false,
        error: '',
        success: '',
    });

    const isAuthenticated = () => {
        const token = localStorage.getItem('token');
        return token !== null && token !== undefined && token !== '';
    };

    const handleChange: React.ChangeEventHandler<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    > = e => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const fetchCompletedBookings = async () => {
        if (!isAuthenticated()) return;
        try {
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
                const completed: Booking[] = data.data.filter(
                    (booking: Booking) =>
                        booking.status === 'checked_out' &&
                        booking.checkOutDate &&
                        new Date(booking.checkOutDate).getTime() < new Date().getTime(),
                );
                setCompletedBookings(completed);
            }
        } catch (err) {
            console.error('Error fetching completed bookings:', err);
        }
    };

    const handleSubmit: React.FormEventHandler<HTMLFormElement> = async e => {
        e.preventDefault();
        setStatus({ sending: true, success: '', error: '' });

        try {
            const response = await api.post('/api/reviews', {
                room: form.room,
                rating: parseInt(form.rating, 10),
                comment: form.comment,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    (errorData && errorData.message) || 'Failed to submit review',
                );
            }

            const data = await response.json();
            if (data.success) {
                setStatus({
                    sending: false,
                    success: 'Your review has been submitted successfully!',
                    error: '',
                });
                setForm({ room: '', rating: '', comment: '' });
            }
        } catch (err: unknown) {
            const message =
                err && typeof err === 'object' && 'message' in err
                    ? String((err as Error).message)
                    : 'Something went wrong. Please try again.';
            setStatus({
                sending: false,
                success: '',
                error: message,
            });
        }
    };

    const fetchBookings = async () => {
        if (!isAuthenticated()) return;
        try {
            setServiceHubStatus(prev => ({ ...prev, loading: true, error: '' }));
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
                const confirmed: Booking[] = data.data.filter(
                    (booking: Booking) =>
                        booking.status === 'confirmed' ||
                        booking.status === 'checked_in',
                );
                setBookings(confirmed);
            }
            setServiceHubStatus(prev => ({ ...prev, loading: false }));
        } catch (err: unknown) {
            const message =
                err && typeof err === 'object' && 'message' in err
                    ? String((err as Error).message)
                    : 'Error loading bookings';
            setServiceHubStatus({ loading: false, error: message, success: '' });
        }
    };

    useEffect(() => {
        if (isAuthenticated()) {
            fetchBookings();
            fetchCompletedBookings();
        }
    }, []);

    const handleServiceSubmit: React.FormEventHandler<HTMLFormElement> = async e => {
        e.preventDefault();

        if (!serviceRequest.bookingId || !serviceRequest.roomId) {
            setServiceHubStatus({
                loading: false,
                error: 'Please select both booking and room, and choose a service type.',
                success: '',
            });
            return;
        }

        try {
            setServiceHubStatus(prev => ({ ...prev, loading: true, error: '' }));

            const selectedBooking = bookings.find(
                b => b._id === serviceRequest.bookingId,
            );
            if (!selectedBooking) {
                throw new Error('Selected booking not found');
            }

            const response = await api.post('/api/service-requests', {
                room: serviceRequest.roomId,
                type: serviceRequest.type,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    (errorData && errorData.message) ||
                    'Failed to submit service request',
                );
            }

            const data = await response.json();
            if (data.success) {
                setServiceHubStatus({
                    loading: false,
                    error: '',
                    success: 'Service request submitted successfully!',
                });
                setServiceRequest({ bookingId: '', roomId: '', type: 'cleaning' });

                setTimeout(() => {
                    setShowServiceModal(false);
                    setServiceHubStatus({ loading: false, error: '', success: '' });
                }, 2000);
            }
        } catch (err: unknown) {
            const message =
                err && typeof err === 'object' && 'message' in err
                    ? String((err as Error).message)
                    : 'Error submitting service request';
            setServiceHubStatus({ loading: false, error: message, success: '' });
        }
    };

    const handleBookingChange: React.ChangeEventHandler<HTMLSelectElement> = e => {
        const bookingId = e.target.value;
        const selected = bookings.find(b => b._id === bookingId);
        setServiceRequest(prev => ({
            ...prev,
            bookingId,
            roomId: selected?.room?._id || '',
        }));
    };

    const handleRoomChange: React.ChangeEventHandler<HTMLSelectElement> = e => {
        setServiceRequest(prev => ({
            ...prev,
            roomId: e.target.value,
        }));
    };

    return (
        <div className="min-h-screen bg-[#FDF8F3] text-[#2C2416] font-[Lato,sans-serif] dark:bg-[#121212] dark:text-[#F5F0E6] transition-colors duration-300">
            <Navbar />

            {/* HERO WITH OVERLAY + TAGLINE */}
            <section className="relative flex min-h-[480px] items-center justify-center overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center scale-[1.06]"
                    style={{ backgroundImage: `url(${heroImage})` }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(44,36,22,0.9)_0%,rgba(139,105,20,0.82)_45%,rgba(184,212,227,0.3)_100%)]" />
                <div className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-col px-6 py-16 text-white">
                    <p className="mb-2 text-[0.85rem] font-semibold uppercase tracking-[0.18em] text-[#E8DCC8] mt-10 dark:text-[#A8A29E]">
                        Contact Hotelmania
                    </p>
                    <h1
                        className="mb-3 text-3xl md:text-4xl lg:text-[2.6rem] dark:text-[#F5F0E6]"
                        style={{ fontFamily: 'Playfair Display, serif' }}
                    >
                        Every Question, Seamlessly Answered
                    </h1>
                    <p className="max-w-xl text-[0.96rem] leading-7 text-[#F5F0E6] dark:text-gray-300">
                        From service requests during your stay to long-term partnership
                        inquiries, the concierge and support teams are only a message away.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-4 text-[0.8rem]">
                        <div className="rounded-full bg-black/35 px-4 py-2">
                            24/7 Concierge Emails
                        </div>
                        <div className="rounded-full bg-black/35 px-4 py-2">
                            Dedicated Stay Specialists
                        </div>
                        <div className="rounded-full bg-black/35 px-4 py-2">
                            Response within 24 hours
                        </div>
                    </div>
                </div>
            </section>

            <main className="mx-auto max-w-[1400px] px-6 py-12 space-y-12">
                {/* STATS / QUICK CONTACT STRIP */}
                <section className="grid gap-4 rounded-2xl bg-white p-5 shadow-[0_4px_20px_rgba(92,64,51,0.1)] md:grid-cols-3 dark:bg-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F0E6] text-[#8B6914] dark:bg-gray-700 dark:text-[#D4AF37]">
                            ✉️
                        </div>
                        <div>
                            <p className="text-[0.8rem] uppercase tracking-[0.14em] text-[#8B6914] dark:text-[#D4AF37]">
                                Email Us
                            </p>
                            <p className="text-[0.9rem] text-[#2C2416] dark:text-[#F5F0E6]">
                                concierge@hotelmania.com
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F0E6] text-[#8B6914] dark:bg-gray-700 dark:text-[#D4AF37]">
                            ☎️
                        </div>
                        <div>
                            <p className="text-[0.8rem] uppercase tracking-[0.14em] text-[#8B6914] dark:text-[#D4AF37]">
                                Call
                            </p>
                            <p className="text-[0.9rem] text-[#2C2416] dark:text-[#F5F0E6]">+1 (212) 555-0199</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F0E6] text-[#8B6914] dark:bg-gray-700 dark:text-[#D4AF37]">
                            📍
                        </div>
                        <div>
                            <p className="text-[0.8rem] uppercase tracking-[0.14em] text-[#8B6914] dark:text-[#D4AF37]">
                                Visit
                            </p>
                            <p className="text-[0.9rem] text-[#2C2416] dark:text-[#F5F0E6]">
                                Grand Vista Hotel, Manhattan
                            </p>
                        </div>
                    </div>
                </section>

                {/* SERVICE HUB + LOCATION CARD */}
                <section className="grid gap-8 lg:grid-cols-[1.5fr,1fr]">
                    {/* Service Hub */}
                    <div className="rounded-2xl bg-white p-6 shadow-[0_4px_24px_rgba(92,64,51,0.12)] dark:bg-gray-800">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="mb-1 text-[0.85rem] font-semibold uppercase tracking-[0.18em] text-[#8B6914] dark:text-[#D4AF37]">
                                    In-Stay Service Hub
                                </p>
                                <h2
                                    className="text-xl md:text-2xl dark:text-[#F5F0E6]"
                                    style={{ fontFamily: 'Playfair Display, serif' }}
                                >
                                    Request Additional Services During Your Stay
                                </h2>
                                <p className="mt-1 text-[0.9rem] text-[#6B5B4F] dark:text-gray-300">
                                    Cleaning, food and beverage, and maintenance requests routed
                                    directly to your current room.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowServiceModal(true)}
                                className="rounded-full border-2 border-[#8B6914] bg-[#8B6914] px-5 py-2 text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-white hover:bg-transparent hover:text-[#8B6914] transition dark:bg-[#D4AF37] dark:text-[#2C2416] dark:border-[#D4AF37] dark:hover:bg-transparent dark:hover:text-[#D4AF37]"
                                disabled={!isAuthenticated()}
                            >
                                Open Service Hub
                            </button>
                        </div>

                        {!isAuthenticated() ? (
                            <div className="rounded-xl bg-[#FDF8F3] px-4 py-4 text-[0.9rem] text-[#6B5B4F] dark:bg-gray-700 dark:text-gray-300">
                                Sign in to see active bookings and request in-stay services.
                            </div>
                        ) : bookings.length === 0 ? (
                            <div className="rounded-xl bg-[#FDF8F3] px-4 py-4 text-[0.9rem] text-[#6B5B4F] dark:bg-gray-700 dark:text-gray-300">
                                You do not have any confirmed or checked-in bookings right
                                now. Services are available while a stay is active.
                            </div>
                        ) : (
                            <div className="space-y-2 text-[0.9rem] text-[#6B5B4F] dark:text-gray-300">
                                {bookings.slice(0, 3).map(b => (
                                    <div
                                        key={b._id || b.id}
                                        className="flex justify-between rounded-xl bg-[#F5F0E6] px-4 py-3 dark:bg-gray-700"
                                    >
                                        <div>
                                            <p className="text-[0.85rem] font-semibold dark:text-[#F5F0E6]">
                                                Booking {b._id || 'N/A'}
                                            </p>
                                            <p className="text-[0.85rem] dark:text-gray-300">
                                                Room:{' '}
                                                {typeof b.room?.type === 'object' &&
                                                    b.room?.type?.name
                                                    ? b.room.type.name
                                                    : 'Room'}{' '}
                                                • Status: {b.status}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {serviceHubStatus.error && (
                            <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[0.85rem] text-rose-800 border border-rose-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800">
                                {serviceHubStatus.error}
                            </p>
                        )}
                        {serviceHubStatus.success && (
                            <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-[0.85rem] text-emerald-800 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800">
                                {serviceHubStatus.success}
                            </p>
                        )}
                    </div>

                    {/* Location / Map style card */}
                    <div className="rounded-2xl bg-white p-6 shadow-[0_4px_24px_rgba(92,64,51,0.12)] dark:bg-gray-800">
                        <h2
                            className="mb-2 text-xl md:text-2xl dark:text-[#F5F0E6]"
                            style={{ fontFamily: 'Playfair Display, serif' }}
                        >
                            Visit Grand Vista
                        </h2>
                        <p className="text-[0.95rem] text-[#2C2416] font-semibold dark:text-[#F5F0E6]">
                            Grand Vista Hotel
                        </p>
                        <p className="text-[0.9rem] text-[#6B5B4F] dark:text-gray-300">
                            123 Luxury Avenue
                            <br />
                            Manhattan, New York, NY 10001
                        </p>
                        <p className="mt-3 text-[0.9rem] text-[#6B5B4F] dark:text-gray-300">
                            Nestled between galleries, fine dining, and iconic skyline
                            views, Grand Vista brings the city to your doorstep.
                        </p>
                        <div className="mt-4 h-64 overflow-hidden rounded-xl border border-[#D4C4A8] dark:border-gray-600">
                            <iframe
                                title="Grand Vista Location"
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3022.9663095343008!2d-74.00425878428698!3d40.74076684379132!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c259bf5c1654f3%3A0xc80f9cfce5383d5d!2sGoogle!5e0!3m2!1sen!2sus!4v1586000412513!5m2!1sen!2sus"
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                allowFullScreen={true}
                                loading="lazy"
                            />
                        </div>
                    </div>
                </section>

                {/* TEAM / FOUNDERS SECTION */}
                <section className="rounded-2xl bg-white p-6 shadow-[0_4px_20px_rgba(92,64,51,0.1)] dark:bg-gray-800">
                    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                        <div className="max-w-xl">
                            <p className="mb-1 text-[0.85rem] font-semibold uppercase tracking-[0.18em] text-[#8B6914] dark:text-[#D4AF37]">
                                The Hotelmania Team
                            </p>
                            <h2
                                className="text-xl md:text-2xl dark:text-[#F5F0E6]"
                                style={{ fontFamily: 'Playfair Display, serif' }}
                            >
                                Crafted by Hoteliers, Designers, and Engineers
                            </h2>
                            <p className="mt-1 text-[0.9rem] text-[#6B5B4F] dark:text-gray-300">
                                Hotelmania was shaped by people who live and breathe
                                hospitality, ensuring every interaction feels graceful and
                                considered.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-3 text-[0.9rem] text-[#6B5B4F] dark:text-gray-300">
                        <div className="flex flex-col gap-2 rounded-xl bg-[#FDF8F3] p-4 dark:bg-gray-700">
                            <img
                                src={alexandraImg}
                                alt="Alexandra Reed"
                                className="h-16 w-16 rounded-full object-cover border-2 border-[#8B6914]/20"
                            />
                            <div>
                                <h3
                                    className="text-[1rem] font-semibold text-[#2C2416] dark:text-[#F5F0E6]"
                                    style={{ fontFamily: 'Playfair Display, serif' }}
                                >
                                    Alexandra Reed
                                </h3>
                                <p className="text-[0.85rem] text-[#8B6914] dark:text-[#D4AF37]">
                                    Co‑Founder &amp; Experience Director
                                </p>
                            </div>
                            <p className="dark:text-gray-300">
                                Oversees the guest journey to ensure Hotelmania mirrors the
                                warmth and polish of a true luxury stay.
                            </p>
                        </div>
                        <div className="flex flex-col gap-2 rounded-xl bg-[#FDF8F3] p-4 dark:bg-gray-700">
                            <img
                                src={danielImg}
                                alt="Daniel Hart"
                                className="h-16 w-16 rounded-full object-cover border-2 border-[#8B6914]/20"
                            />
                            <div>
                                <h3
                                    className="text-[1rem] font-semibold text-[#2C2416] dark:text-[#F5F0E6]"
                                    style={{ fontFamily: 'Playfair Display, serif' }}
                                >
                                    Daniel Hart
                                </h3>
                                <p className="text-[0.85rem] text-[#8B6914] dark:text-[#D4AF37]">
                                    Co‑Founder &amp; Technical Lead
                                </p>
                            </div>
                            <p className="dark:text-gray-300">
                                Crafts the systems that connect rooms, bookings, and profiles
                                into a seamless platform.
                            </p>
                        </div>
                        <div className="flex flex-col gap-2 rounded-xl bg-[#FDF8F3] p-4 dark:bg-gray-700">
                            <img
                                src={mayaImg}
                                alt="Maya Chen"
                                className="h-16 w-16 rounded-full object-cover border-2 border-[#8B6914]/20"
                            />
                            <div>
                                <h3
                                    className="text-[1rem] font-semibold text-[#2C2416] dark:text-[#F5F0E6]"
                                    style={{ fontFamily: 'Playfair Display, serif' }}
                                >
                                    Maya Chen
                                </h3>
                                <p className="text-[0.85rem] text-[#8B6914] dark:text-[#D4AF37]">
                                    Design &amp; Brand Lead
                                </p>
                            </div>
                            <p className="dark:text-gray-300">
                                Shapes the visual language, from typography to color, to
                                capture the Hotelmania personality.
                            </p>
                        </div>
                    </div>
                </section>

                {/* REVIEW FORM + SUPPORT INFO */}
                <section className="grid gap-8 lg:grid-cols-[1.5fr,1fr]">
                    {/* Review form */}
                    <div className="rounded-2xl bg-white p-6 shadow-[0_4px_20px_rgba(92,64,51,0.1)] dark:bg-gray-800">
                        <div className="mb-4 max-w-xl">
                            <p className="mb-1 text-[0.85rem] font-semibold uppercase tracking-[0.18em] text-[#8B6914] dark:text-[#D4AF37]">
                                Share Your Experience
                            </p>
                            <h2
                                className="text-xl md:text-2xl dark:text-[#F5F0E6]"
                                style={{ fontFamily: 'Playfair Display, serif' }}
                            >
                                Tell Us About Your Stay
                            </h2>
                            <p className="mt-1 text-[0.9rem] text-[#6B5B4F] dark:text-gray-300">
                                Reviews help refine the little details, from pillow menus to
                                check-in rituals, so each new stay feels even better.
                            </p>
                        </div>

                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <div className="flex flex-col gap-1">
                                <label className="text-[0.85rem] font-semibold text-[#6B5B4F] dark:text-gray-300">
                                    Completed stay
                                </label>
                                <select
                                    name="room"
                                    value={form.room}
                                    onChange={handleChange}
                                    className="rounded border border-[#D4C4A8] bg-[#FDF8F3] px-3 py-2.5 text-[0.9rem] text-[#2C2416] focus:border-[#8B6914] focus:bg-white focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-[#F5F0E6] dark:focus:border-[#D4AF37]"
                                >
                                    <option value="">Choose a room / booking</option>
                                    {completedBookings.map(booking => (
                                        <option
                                            key={booking._id || booking.id}
                                            value={booking.room?._id || ''}
                                            className="dark:bg-gray-700 dark:text-[#F5F0E6]"
                                        >
                                            {booking._id} –{' '}
                                            {typeof booking.room?.type === 'object' &&
                                                booking.room?.type?.name
                                                ? booking.room.type.name
                                                : 'Room'}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[0.85rem] font-semibold text-[#6B5B4F] dark:text-gray-300">
                                    Rating
                                </label>
                                <select
                                    name="rating"
                                    value={form.rating}
                                    onChange={handleChange}
                                    className="rounded border border-[#D4C4A8] bg-[#FDF8F3] px-3 py-2.5 text-[0.9rem] text-[#2C2416] focus:border-[#8B6914] focus:bg-white focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-[#F5F0E6] dark:focus:border-[#D4AF37]"
                                >
                                    <option value="">Select rating</option>
                                    <option value="5">5 – Excellent</option>
                                    <option value="4">4 – Very Good</option>
                                    <option value="3">3 – Good</option>
                                    <option value="2">2 – Fair</option>
                                    <option value="1">1 – Poor</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[0.85rem] font-semibold text-[#6B5B4F] dark:text-gray-300">
                                    Comments
                                </label>
                                <textarea
                                    name="comment"
                                    value={form.comment}
                                    onChange={handleChange}
                                    rows={4}
                                    placeholder="What made your stay memorable? What could be refined?"
                                    className="w-full rounded border border-[#D4C4A8] bg-[#FDF8F3] px-3 py-2.5 text-[0.9rem] text-[#2C2416] placeholder:text-[#B8A58B] focus:border-[#8B6914] focus:bg-white focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-[#F5F0E6] dark:placeholder:text-gray-400"
                                />
                            </div>

                            {status.error && (
                                <p className="rounded-lg bg-rose-50 px-3 py-2 text-[0.85rem] text-rose-800 border border-rose-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800">
                                    {status.error}
                                </p>
                            )}
                            {status.success && (
                                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-[0.85rem] text-emerald-800 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800">
                                    {status.success}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={status.sending}
                                className="mt-2 inline-flex items-center justify-center rounded border-2 border-[#8B6914] bg-[#8B6914] px-5 py-2.5 text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-white hover:bg-transparent hover:text-[#8B6914] transition disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#D4AF37] dark:text-[#2C2416] dark:border-[#D4AF37] dark:hover:bg-transparent dark:hover:text-[#D4AF37]"
                            >
                                {status.sending ? 'Sending...' : 'Submit Review'}
                            </button>
                        </form>
                    </div>

                    {/* FAQ / Support */}
                    <div className="rounded-2xl bg-white p-6 shadow-[0_4px_20px_rgba(92,64,51,0.1)] dark:bg-gray-800">
                        <h2
                            className="mb-3 text-xl md:text-2xl dark:text-[#F5F0E6]"
                            style={{ fontFamily: 'Playfair Display, serif' }}
                        >
                            Questions, Answered
                        </h2>
                        <div className="space-y-3 text-[0.9rem] text-[#6B5B4F] dark:text-gray-300">
                            <div>
                                <p className="font-semibold text-[#2C2416] dark:text-[#F5F0E6]">
                                    How quickly will someone respond?
                                </p>
                                <p className="dark:text-gray-300">
                                    For active stays, service requests are routed instantly to
                                    the on-duty team. For emails, expect a reply within 24
                                    hours.
                                </p>
                            </div>
                            <div>
                                <p className="font-semibold text-[#2C2416] dark:text-[#F5F0E6]">
                                    Can I modify a booking through this page?
                                </p>
                                <p className="dark:text-gray-300">
                                    Booking changes are handled via your bookings section. Use
                                    this page for service requests and general questions.
                                </p>
                            </div>
                            <div>
                                <p className="font-semibold text-[#2C2416] dark:text-[#F5F0E6]">
                                    Do I need an account to submit requests?
                                </p>
                                <p className="dark:text-gray-300">
                                    An account is required to link services to your room and to
                                    submit stay-linked reviews.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* SERVICE MODAL (BOOKING + ROOM + TYPE) */}
            {showServiceModal && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4"
                    onClick={() => setShowServiceModal(false)}
                >
                    <div
                        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-800"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-[#E8DCC8] px-6 py-4 dark:border-gray-600">
                            <h2
                                className="text-lg md:text-xl dark:text-[#F5F0E6]"
                                style={{ fontFamily: 'Playfair Display, serif' }}
                            >
                                Request a Service
                            </h2>
                            <button
                                type="button"
                                onClick={() => setShowServiceModal(false)}
                                className="text-2xl leading-none text-[#6B5B4F] hover:text-[#8B6914] dark:text-gray-300 dark:hover:text-[#D4AF37]"
                            >
                                ×
                            </button>
                        </div>
                        <form className="px-6 py-5 space-y-4" onSubmit={handleServiceSubmit}>
                            <div className="flex flex-col gap-1 text-[0.9rem]">
                                <label className="font-semibold text-[#6B5B4F] dark:text-gray-300">
                                    Booking
                                </label>
                                <select
                                    value={serviceRequest.bookingId}
                                    onChange={handleBookingChange}
                                    className="rounded border border-[#D4C4A8] bg-[#FDF8F3] px-3 py-2.5 text-[0.9rem] text-[#2C2416] focus:border-[#8B6914] focus:bg-white focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-[#F5F0E6] dark:focus:border-[#D4AF37]"
                                >
                                    <option value="">Choose a booking</option>
                                    {bookings.map(b => (
                                        <option key={b._id || b.id} value={b._id} className="dark:bg-gray-700 dark:text-[#F5F0E6]">
                                            {b._id} –{' '}
                                            {typeof b.room?.type === 'object' &&
                                                b.room?.type?.name
                                                ? b.room.type.name
                                                : 'Room'}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col gap-1 text-[0.9rem]">
                                <label className="font-semibold text-[#6B5B4F] dark:text-gray-300">
                                    Room
                                </label>
                                <select
                                    value={serviceRequest.roomId}
                                    onChange={handleRoomChange}
                                    className="rounded border border-[#D4C4A8] bg-[#FDF8F3] px-3 py-2.5 text-[0.9rem] text-[#2C2416] focus:border-[#8B6914] focus:bg-white focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-[#F5F0E6] dark:focus:border-[#D4AF37]"
                                >
                                    <option value="">Select room</option>
                                    {bookings
                                        .filter(b => b._id === serviceRequest.bookingId)
                                        .map(b => (
                                            <option
                                                key={b._id || b.id}
                                                value={b.room?._id || ''}
                                                className="dark:bg-gray-700 dark:text-[#F5F0E6]"
                                            >
                                                {b.room?._id || 'Room'} –{' '}
                                                {typeof b.room?.type === 'object' &&
                                                    b.room?.type?.name
                                                    ? b.room.type.name
                                                    : 'Room'}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            <div className="flex flex-col gap-1 text-[0.9rem]">
                                <label className="font-semibold text-[#6B5B4F] dark:text-gray-300">
                                    Service Type
                                </label>
                                <select
                                    value={serviceRequest.type}
                                    onChange={e =>
                                        setServiceRequest(prev => ({
                                            ...prev,
                                            type: e.target.value,
                                        }))
                                    }
                                    className="rounded border border-[#D4C4A8] bg-[#FDF8F3] px-3 py-2.5 text-[0.9rem] text-[#2C2416] focus:border-[#8B6914] focus:bg-white focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-[#F5F0E6] dark:focus:border-[#D4AF37]"
                                >
                                    <option value="cleaning">Cleaning</option>
                                    <option value="food">Food &amp; Beverage</option>
                                    <option value="repair">Maintenance / Repair</option>
                                </select>
                            </div>

                            {serviceHubStatus.error && (
                                <p className="rounded-lg bg-rose-50 px-3 py-2 text-[0.85rem] text-rose-800 border border-rose-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800">
                                    {serviceHubStatus.error}
                                </p>
                            )}
                            {serviceHubStatus.success && (
                                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-[0.85rem] text-emerald-800 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800">
                                    {serviceHubStatus.success}
                                </p>
                            )}

                            <div className="flex justify-end pt-2">
                                <button
                                    type="submit"
                                    disabled={serviceHubStatus.loading}
                                    className="rounded border-2 border-[#8B6914] bg-[#8B6914] px-5 py-2.5 text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-white hover:bg-transparent hover:text-[#8B6914] transition disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#D4AF37] dark:text-[#2C2416] dark:border-[#D4AF37] dark:hover:bg-transparent dark:hover:text-[#D4AF37]"
                                >
                                    {serviceHubStatus.loading
                                        ? 'Submitting...'
                                        : 'Submit Request'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
};

export default Contact;
