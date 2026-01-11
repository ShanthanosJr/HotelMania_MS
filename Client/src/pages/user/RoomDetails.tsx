import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { api } from '../../utils/api';

type RoomType = {
    _id?: string;
    id?: string;
    name?: string;
    description?: string;
    photos?: string[];
    amenities?: string[];
    hotel?: { _id?: string } | string;
    basePrice?: number;
    maxOccupancy?: number;
    size?: number;
    view?: string;
    bedType?: string;
};

type PhysicalRoom = {
    _id?: string;
    id?: string;
    roomNumber?: string;
    type?: {
        _id?: string;
        name?: string;
        basePrice?: number;
        maxOccupancy?: number;
    } | string;
};

type BookingDates = {
    checkInDate: string;
    checkOutDate: string;
};

type CardDetails = {
    cardNumber: string;
    expiryDate: string;
    cvv: string;
};

const fallbackHero =
    'https://images.pexels.com/photos/271639/pexels-photo-271639.jpeg?auto=compress&cs=tinysrgb&w=1600';

const RoomDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();

    const [room, setRoom] = useState<RoomType | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // booking state
    const [showModal, setShowModal] = useState(false);
    const [bookingStep, setBookingStep] = useState(1);
    const [selectedPhysicalRoom, setSelectedPhysicalRoom] = useState<PhysicalRoom | null>(null);
    const [availableRooms, setAvailableRooms] = useState<PhysicalRoom[]>([]);
    const [loadingRooms, setLoadingRooms] = useState(false);
    const [bookingDates, setBookingDates] = useState<BookingDates>({
        checkInDate: '',
        checkOutDate: '',
    });
    const [paymentMethod] = useState<
        'credit_card' | 'debit_card' | 'bank_transfer' | 'cash'
    >('credit_card');

    // Saved cards state
    const [savedCards, setSavedCards] = useState<any[]>([]);
    const [useSavedCard, setUseSavedCard] = useState(false);
    const [selectedSavedCardIdx, setSelectedSavedCardIdx] = useState(-1);

    const [cardDetails, setCardDetails] = useState<CardDetails>({
        cardNumber: '',
        expiryDate: '',
        cvv: '',
    });
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        const fetchRoomDetails = async () => {
            try {
                setLoading(true);
                const response = await api.get('/api/room-types');
                if (!response.ok) throw new Error('Failed to fetch room');

                const data = await response.json();
                if (data.success) {
                    const foundRoom: RoomType | undefined = data.data.find(
                        (r: RoomType) => r._id === id || r.id === id,
                    );
                    if (foundRoom) {
                        setRoom(foundRoom);
                    } else {
                        setError('Room not found');
                    }
                } else {
                    setError('Room not found');
                }
            } catch (err: unknown) {
                const message =
                    err && typeof err === 'object' && 'message' in err
                        ? String((err as Error).message)
                        : 'Unknown error';
                setError(message);
            } finally {
                setLoading(false);
            }
        };

        fetchRoomDetails();
    }, [id]);

    const openBookingModal = async () => {
        if (!room) return;

        // Check if logged in first
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please log in to book');
            window.location.href = '/login';
            return;
        }

        setShowModal(true);
        setBookingStep(1);
        setAvailableRooms([]);

        // Pre-fetch profile for saved cards
        try {
            const profileRes = await api.get('/api/auth/profile');
            const profileData = await profileRes.json();
            if (profileData.success && profileData.user.savedCards) {
                setSavedCards(profileData.user.savedCards);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setBookingStep(1);
        setAvailableRooms([]);
        setSelectedPhysicalRoom(null);
    };

    const handleCheckAvailability = async () => {
        if (!room || !bookingDates.checkInDate || !bookingDates.checkOutDate) return;

        setLoadingRooms(true);
        try {
            if (!room.hotel) throw new Error('Hotel infomation missing');

            const hotelId = typeof room.hotel === 'string' ? room.hotel : room.hotel._id || room.hotel;
            const query = `/api/rooms?hotel=${hotelId}&checkIn=${bookingDates.checkInDate}&checkOut=${bookingDates.checkOutDate}`;
            const response = await api.get(query);

            if (!response.ok) throw new Error('Failed to fetch rooms');

            const data = await response.json();
            if (data.success) {
                // Filter by Room Type
                const matchingRooms: PhysicalRoom[] = data.data.filter(
                    (r: PhysicalRoom) =>
                        (typeof r.type !== 'string' && r.type?._id === room._id) ||
                        r.type === room._id,
                );
                setAvailableRooms(matchingRooms);
                setBookingStep(2);
            }
        } catch (err) {
            console.error(err);
            alert('Failed to check availability');
        } finally {
            setLoadingRooms(false);
        }
    };

    const handleSelectRoom = (physRoom: PhysicalRoom) => {
        setSelectedPhysicalRoom(physRoom);
        setBookingStep(3);
    };

    const calculateTotal = () => {
        if (!bookingDates.checkInDate || !bookingDates.checkOutDate || !room?.basePrice) return 0;
        const checkIn = new Date(bookingDates.checkInDate);
        const checkOut = new Date(bookingDates.checkOutDate);
        const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
        return nights * room.basePrice;
    };

    const initiateBooking = async () => {
        if (!room || !selectedPhysicalRoom) return;

        if (paymentMethod === 'credit_card' || paymentMethod === 'debit_card') {
            if (!cardDetails.cardNumber || !cardDetails.expiryDate || !cardDetails.cvv) {
                if (!useSavedCard) { // If using saved card, we might not need to re-enter everything in a real app, but here we require strictness or just flow 
                    alert('Enter card details');
                    return;
                }
            }
        }

        setIsProcessing(true);

        const totalPrice = calculateTotal();
        const roomId = selectedPhysicalRoom._id || selectedPhysicalRoom.id;

        const bookingData = {
            room: roomId,
            checkInDate: bookingDates.checkInDate,
            checkOutDate: bookingDates.checkOutDate,
            totalPrice,
        };

        try {
            const res = await api.post('/api/bookings', bookingData);
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Booking failed');
            }

            const result = await res.json();
            const bookingId: string = result.data._id;

            const txnData = {
                booking: bookingId,
                amount: totalPrice,
                type: paymentMethod,
                transactionId: `TXN-${Date.now()}`,
                paymentDetails:
                    (paymentMethod === 'credit_card' || paymentMethod === 'debit_card')
                        ? cardDetails
                        : undefined,
            };

            const txnRes = await api.post('/api/transactions', txnData);
            if (txnRes.ok) {
                alert('Booking Successful!');
                window.location.href = '/bookings';
            } else {
                alert('Booking created but payment failed.');
                window.location.href = '/bookings';
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Error';
            alert(message);
        } finally {
            setIsProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FDF8F3] dark:bg-[#121212] text-[#2C2416] dark:text-[#F5F0E6] font-[Lato,sans-serif] transition-colors duration-300">
                <Navbar />
                <div className="py-32 text-center text-sm text-[#6B5B4F] dark:text-gray-300">Loading...</div>
                <Footer />
            </div>
        );
    }
    if (error) {
        return (
            <div className="min-h-screen bg-[#FDF8F3] dark:bg-[#121212] text-[#2C2416] dark:text-[#F5F0E6] font-[Lato,sans-serif] transition-colors duration-300">
                <Navbar />
                <div className="py-32 text-center text-sm text-red-700 dark:text-red-400">{error}</div>
                <Footer />
            </div>
        );
    }
    if (!room) {
        return (
            <div className="min-h-screen bg-[#FDF8F3] dark:bg-[#121212] text-[#2C2416] dark:text-[#F5F0E6] font-[Lato,sans-serif] transition-colors duration-300">
                <Navbar />
                <div className="py-32 text-center text-sm text-red-700 dark:text-red-400">Room not found</div>
                <Footer />
            </div>
        );
    }

    const heroImg =
        room.photos && room.photos.length > 0 ? room.photos[0] : fallbackHero;

    return (
        <div className="min-h-screen bg-[#FDF8F3] dark:bg-[#121212] text-[#2C2416] dark:text-[#F5F0E6] font-[Lato,sans-serif] transition-colors duration-300">
            <Navbar />

            {/* HERO */}
            <header className="relative flex h-[480px] items-end overflow-hidden bg-[#2C2416]">
                <div
                    className="absolute inset-0 bg-cover bg-center scale-110 animate-[roomsHeroZoom_18s_ease-in-out_infinite_alternate]"
                    style={{ backgroundImage: `url(${heroImg})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[rgba(44,36,22,0.9)] via-[rgba(44,36,22,0.6)] to-transparent" />
                <div className="relative z-10 mx-auto flex w-full max-w-[1400px] items-end px-6 pb-10">
                    <div>
                        <span className="mb-2 inline-block text-[0.8rem] font-semibold uppercase tracking-[0.18em] text-[#E8DCC8]">
                            Welcome to Luxury
                        </span>
                        <h1
                            className="text-3xl md:text-4xl text-white"
                            style={{ fontFamily: 'Playfair Display, serif' }}
                        >
                            {room.name}
                        </h1>
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT */}
            <main className="mx-auto flex max-w-[1400px] flex-col gap-8 px-6 py-10 md:flex-row md:items-start">
                {/* LEFT */}
                <div className="flex-1 space-y-8">
                    {/* Overview */}
                    <section>
                        <h2
                            className="mb-2 text-xl md:text-2xl"
                            style={{ fontFamily: 'Playfair Display, serif' }}
                        >
                            Overview
                        </h2>
                        <p className="text-[0.95rem] leading-7 text-[#6B5B4F] dark:text-gray-300">
                            {room.description}
                        </p>
                    </section>

                    {/* Amenities */}
                    <section>
                        <h2
                            className="mb-3 text-xl md:text-2xl"
                            style={{ fontFamily: 'Playfair Display, serif' }}
                        >
                            Amenities &amp; Features
                        </h2>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {room.amenities &&
                                room.amenities.map((amenity, index) => (
                                    <div
                                        key={`${amenity}-${index}`}
                                        className="flex items-start gap-2 rounded-lg bg-[#F5F0E6] dark:bg-gray-700 px-3 py-2 text-[0.9rem] text-[#2C2416] dark:text-[#F5F0E6]"
                                    >
                                        <span className="mt-0.5 text-[#8B6914]">✓</span>
                                        <span>{amenity}</span>
                                    </div>
                                ))}
                        </div>
                    </section>

                    {/* Gallery */}
                    <section>
                        <h2
                            className="mb-3 text-xl md:text-2xl"
                            style={{ fontFamily: 'Playfair Display, serif' }}
                        >
                            Gallery
                        </h2>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {room.photos &&
                                room.photos.slice(0, 4).map((photo, idx) => (
                                    <div
                                        key={`${photo}-${idx}`}
                                        className="overflow-hidden rounded-xl bg-[#F5F0E6] dark:bg-gray-700"
                                    >
                                        <img
                                            src={photo}
                                            alt={`Room View ${idx}`}
                                            className="h-40 w-full object-cover transition-transform duration-500 hover:scale-105"
                                        />
                                    </div>
                                ))}
                        </div>
                    </section>

                    <Link
                        to="/rooms"
                        className="mt-5 inline-flex items-center justify-center rounded border border-[#D4C4A8] bg-[#F5F0E6] dark:bg-gray-700 px-5 py-2 text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-[#8B6914] hover:bg-[#8B6914] hover:text-white transition"
                    >
                        ← Back to Rooms
                    </Link>
                </div>

                {/* RIGHT SIDEBAR */}
                <aside className="w-full max-w-sm md:ml-6">
                    <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-[0_8px_30px_rgba(92,64,51,0.15)]">
                        <div className="mb-4 flex items-end gap-1">
                            <span
                                className="text-2xl text-[#8B6914]"
                                style={{ fontFamily: 'Playfair Display, serif' }}
                            >
                                ${room.basePrice}
                            </span>
                            <span className="text-[0.85rem] text-[#6B5B4F] dark:text-gray-300">/ Night</span>
                        </div>
                        <ul className="mb-4 space-y-2 text-[0.9rem] text-[#2C2416] dark:text-[#F5F0E6]">
                            <li className="flex justify-between">
                                <span className="text-[#6B5B4F] dark:text-gray-300">Occupancy</span>
                                <span>Up to {room.maxOccupancy} Guests</span>
                            </li>
                            <li className="flex justify-between">
                                <span className="text-[#6B5B4F] dark:text-gray-300">Size</span>
                                <span>{room.size || 35} m²</span>
                            </li>
                            <li className="flex justify-between">
                                <span className="text-[#6B5B4F] dark:text-gray-300">View</span>
                                <span>{room.view || 'City View'}</span>
                            </li>
                            <li className="flex justify-between">
                                <span className="text-[#6B5B4F] dark:text-gray-300">Bed</span>
                                <span>{room.bedType || 'King Size'}</span>
                            </li>
                        </ul>
                        <button
                            type="button"
                            onClick={openBookingModal}
                            className="w-full rounded border-2 border-[#8B6914] bg-[#8B6914] px-4 py-2.5 text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-white hover:bg-transparent hover:text-[#8B6914] transition"
                        >
                            Book Now
                        </button>
                    </div>
                </aside>
            </main>

            {/* MODAL */}
            {showModal && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
                    onClick={closeModal}
                >
                    <div
                        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white dark:bg-gray-800 shadow-2xl flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-[#E8DCC8] dark:border-gray-700 px-8 py-5">
                            <div>
                                <h2
                                    className="text-xl md:text-2xl dark:text-[#F5F0E6]"
                                    style={{ fontFamily: 'Playfair Display, serif' }}
                                >
                                    {bookingStep === 1
                                        ? 'Select Dates'
                                        : bookingStep === 2
                                            ? 'Select Room'
                                            : 'Payment Details'}
                                </h2>
                                <p className="text-xs text-[#6B5B4F] uppercase tracking-wider dark:text-gray-400 mt-1">
                                    Step {bookingStep} of 3
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeModal}
                                className="text-3xl leading-none text-[#6B5B4F] dark:text-gray-400 hover:text-[#8B6914] transition"
                            >
                                ×
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-8 flex-1 overflow-y-auto">
                            {/* STEP 1: DATES */}
                            {bookingStep === 1 && (
                                <div className="space-y-6">
                                    <div className="grid gap-6 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold uppercase tracking-wider text-[#6B5B4F] dark:text-gray-300">
                                                Check-in Date
                                            </label>
                                            <input
                                                type="date"
                                                min={new Date().toISOString().split('T')[0]}
                                                value={bookingDates.checkInDate}
                                                onChange={e =>
                                                    setBookingDates(prev => ({
                                                        ...prev,
                                                        checkInDate: e.target.value,
                                                    }))
                                                }
                                                className="w-full rounded-lg border border-[#D4C4A8] bg-[#FDF8F3] dark:bg-gray-700 px-4 py-3 text-[#2C2416] dark:text-[#F5F0E6] focus:border-[#8B6914] focus:outline-none dark:border-gray-600 dark:focus:border-[#D4AF37]"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold uppercase tracking-wider text-[#6B5B4F] dark:text-gray-300">
                                                Check-out Date
                                            </label>
                                            <input
                                                type="date"
                                                min={bookingDates.checkInDate || new Date().toISOString().split('T')[0]}
                                                value={bookingDates.checkOutDate}
                                                onChange={e =>
                                                    setBookingDates(prev => ({
                                                        ...prev,
                                                        checkOutDate: e.target.value,
                                                    }))
                                                }
                                                className="w-full rounded-lg border border-[#D4C4A8] bg-[#FDF8F3] dark:bg-gray-700 px-4 py-3 text-[#2C2416] dark:text-[#F5F0E6] focus:border-[#8B6914] focus:outline-none dark:border-gray-600 dark:focus:border-[#D4AF37]"
                                            />
                                        </div>
                                    </div>

                                    <div className="rounded-lg bg-[#F5F0E6] dark:bg-gray-700/50 p-4 border border-[#E8DCC8] dark:border-gray-600">
                                        <p className="text-sm text-[#6B5B4F] dark:text-gray-300">
                                            <span className="font-bold">Note:</span> Standard check-in time is 2:00 PM and check-out time is 11:00 AM.
                                        </p>
                                    </div>

                                    <div className="pt-4 flex justify-end">
                                        <button
                                            onClick={handleCheckAvailability}
                                            disabled={loadingRooms || !bookingDates.checkInDate || !bookingDates.checkOutDate}
                                            className="rounded-full bg-[#8B6914] px-8 py-3 text-sm font-bold uppercase tracking-wider text-white hover:bg-[#705510] transition disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {loadingRooms ? 'Checking...' : 'Check Availability'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: ROOM SELECTION */}
                            {bookingStep === 2 && (
                                <div className="space-y-6">
                                    {availableRooms.length > 0 ? (
                                        <div className="grid gap-4">
                                            {availableRooms.map(physRoom => (
                                                <div
                                                    key={physRoom._id || physRoom.id}
                                                    onClick={() => handleSelectRoom(physRoom)}
                                                    className="group cursor-pointer rounded-xl border border-[#E8DCC8] bg-[#FDF8F3] dark:bg-gray-700 p-5 transition hover:border-[#8B6914] hover:shadow-md dark:border-gray-600 dark:hover:border-[#D4AF37]"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <h4
                                                                className="text-lg font-medium dark:text-[#F5F0E6]"
                                                                style={{ fontFamily: 'Playfair Display, serif' }}
                                                            >
                                                                Room {physRoom.roomNumber}
                                                            </h4>
                                                            <p className="text-sm text-[#6B5B4F] dark:text-gray-300 mt-1">
                                                                {room.view || 'City View'} • {room.bedType || 'King Bed'}
                                                            </p>
                                                        </div>
                                                        <span className="rounded-full border border-[#8B6914] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#8B6914] group-hover:bg-[#8B6914] group-hover:text-white transition dark:text-[#D4AF37] dark:border-[#D4AF37] dark:group-hover:text-[#2C2416]">
                                                            Select
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-10">
                                            <p className="text-[#6B5B4F] dark:text-gray-300 mb-4">No rooms available for the selected dates.</p>
                                            <button
                                                onClick={() => setBookingStep(1)}
                                                className="text-[#8B6914] font-bold text-sm uppercase hover:underline dark:text-[#D4AF37]"
                                            >
                                                Change Dates
                                            </button>
                                        </div>
                                    )}
                                    {availableRooms.length > 0 && (
                                        <button
                                            onClick={() => setBookingStep(1)}
                                            className="text-xs font-bold text-[#6B5B4F] uppercase hover:text-[#2C2416] dark:text-gray-400 dark:hover:text-gray-200"
                                        >
                                            ← Back to Dates
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* STEP 3: PAYMENT */}
                            {bookingStep === 3 && (
                                <div className="space-y-6 animate-fadeIn">
                                    <div className="rounded-xl bg-[#F9F7F2] dark:bg-gray-700/50 p-4 border border-[#E8DCC8] dark:border-gray-600">
                                        <h4 className="font-bold text-[#2C2416] dark:text-[#F5F0E6] mb-2">Booking Summary</h4>
                                        <div className="flex justify-between text-sm text-[#6B5B4F] dark:text-gray-300 mb-1">
                                            <span>Dates</span>
                                            <span className="font-medium text-[#2C2416] dark:text-[#F5F0E6]">
                                                {bookingDates.checkInDate} — {bookingDates.checkOutDate}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm text-[#6B5B4F] dark:text-gray-300 mb-1">
                                            <span>Room</span>
                                            <span className="font-medium text-[#2C2416] dark:text-[#F5F0E6]">
                                                {room.name} (#{selectedPhysicalRoom?.roomNumber})
                                            </span>
                                        </div>
                                        <div className="mt-3 text-right">
                                            <span className="text-xs uppercase tracking-wider text-[#6B5B4F] dark:text-gray-400">Total Price</span>
                                            <p className="text-xl font-bold text-[#8B6914] dark:text-[#D4AF37]" style={{ fontFamily: 'Playfair Display, serif' }}>
                                                ${calculateTotal()}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Saved Cards */}
                                    {savedCards.length > 0 && (
                                        <div>
                                            <label className="mb-3 block text-sm font-bold uppercase tracking-wider text-[#6B5B4F] dark:text-gray-300">
                                                Saved Payment Methods
                                            </label>
                                            <div className="space-y-3">
                                                {savedCards.map((card, idx) => (
                                                    <div
                                                        key={idx}
                                                        onClick={() => {
                                                            setUseSavedCard(true);
                                                            setSelectedSavedCardIdx(idx);
                                                            setCardDetails({
                                                                cardNumber: card.cardNumber,
                                                                expiryDate: card.expiryDate || '',
                                                                cvv: '***', // CVV usually not saved, but for simplicity
                                                            });
                                                        }}
                                                        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${useSavedCard && selectedSavedCardIdx === idx
                                                            ? 'border-[#8B6914] bg-[#F5F0E6] dark:bg-gray-700 dark:border-[#D4AF37]'
                                                            : 'border-[#D4C4A8] hover:border-[#8B6914] dark:border-gray-600 dark:hover:border-[#D4AF37]'
                                                            }`}
                                                    >
                                                        <div className="flex h-8 w-12 items-center justify-center rounded bg-gray-200 dark:bg-gray-600 text-xs font-bold text-[#555] dark:text-gray-300">
                                                            {card.cardType === 'credit_card' ? 'CARD' : 'BANK'}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-semibold text-[#2C2416] dark:text-[#F5F0E6]">{card.cardNumber}</p>
                                                            <p className="text-xs text-[#6B5B4F] dark:text-gray-400">Exp: {card.expiryDate}</p>
                                                        </div>
                                                        {useSavedCard && selectedSavedCardIdx === idx && (
                                                            <span className="text-[#8B6914] dark:text-[#D4AF37]">✓</span>
                                                        )}
                                                    </div>
                                                ))}
                                                <div
                                                    onClick={() => {
                                                        setUseSavedCard(false);
                                                        setSelectedSavedCardIdx(-1);
                                                        setCardDetails({ cardNumber: '', expiryDate: '', cvv: '' });
                                                    }}
                                                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${!useSavedCard
                                                        ? 'border-[#8B6914] bg-[#F5F0E6] dark:bg-gray-700 dark:border-[#D4AF37]'
                                                        : 'border-[#D4C4A8] hover:border-[#8B6914] dark:border-gray-600 dark:hover:border-[#D4AF37]'
                                                        }`}
                                                >
                                                    <div className="flex h-8 w-12 items-center justify-center rounded bg-white border border-dashed border-gray-400 text-xs font-bold text-[#555]">
                                                        +
                                                    </div>
                                                    <span className="text-sm font-semibold text-[#2C2416] dark:text-[#F5F0E6]">Use a new card</span>
                                                    {!useSavedCard && <span className="text-[#8B6914] dark:text-[#D4AF37]">✓</span>}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* New Card Form */}
                                    {!useSavedCard && (
                                        <div className="space-y-4 pt-2">
                                            <div>
                                                <label className="mb-1 block text-sm font-semibold text-[#6B5B4F] dark:text-gray-300">Card Number</label>
                                                <input
                                                    type="text"
                                                    value={cardDetails.cardNumber}
                                                    onChange={e => setCardDetails({ ...cardDetails, cardNumber: e.target.value })}
                                                    placeholder="0000 0000 0000 0000"
                                                    className="w-full rounded-lg border border-[#D4C4A8] bg-[#FDF8F3] px-3 py-2 text-[#2C2416] outline-none focus:border-[#8B6914] dark:bg-gray-700 dark:border-gray-600 dark:text-[#F5F0E6] dark:focus:border-[#D4AF37]"
                                                />
                                            </div>
                                            <div className="flex gap-4">
                                                <div className="flex-1">
                                                    <label className="mb-1 block text-sm font-semibold text-[#6B5B4F] dark:text-gray-300">Expiry</label>
                                                    <input
                                                        type="text"
                                                        value={cardDetails.expiryDate}
                                                        onChange={e => setCardDetails({ ...cardDetails, expiryDate: e.target.value })}
                                                        placeholder="MM/YY"
                                                        className="w-full rounded-lg border border-[#D4C4A8] bg-[#FDF8F3] px-3 py-2 text-[#2C2416] outline-none focus:border-[#8B6914] dark:bg-gray-700 dark:border-gray-600 dark:text-[#F5F0E6] dark:focus:border-[#D4AF37]"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="mb-1 block text-sm font-semibold text-[#6B5B4F] dark:text-gray-300">CVV</label>
                                                    <input
                                                        type="text"
                                                        value={cardDetails.cvv}
                                                        onChange={e => setCardDetails({ ...cardDetails, cvv: e.target.value })}
                                                        placeholder="123"
                                                        className="w-full rounded-lg border border-[#D4C4A8] bg-[#FDF8F3] px-3 py-2 text-[#2C2416] outline-none focus:border-[#8B6914] dark:bg-gray-700 dark:border-gray-600 dark:text-[#F5F0E6] dark:focus:border-[#D4AF37]"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-3 pt-4">
                                        <button
                                            onClick={() => setBookingStep(2)}
                                            className="px-6 py-3 rounded-full border border-[#8B6914] text-[#8B6914] text-sm font-bold uppercase hover:bg-[#8B6914] hover:text-white transition dark:border-[#D4AF37] dark:text-[#D4AF37] dark:hover:bg-[#D4AF37] dark:hover:text-[#2C2416]"
                                        >
                                            Back
                                        </button>
                                        <button
                                            onClick={initiateBooking}
                                            disabled={isProcessing}
                                            className="flex-1 rounded-full bg-[#8B6914] text-white text-sm font-bold uppercase hover:bg-[#705510] transition disabled:opacity-50"
                                        >
                                            {isProcessing ? 'Processing...' : `Pay $${calculateTotal()}`}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <Footer />

            <style>{`
        @keyframes roomsHeroZoom {
          0% { transform: scale(1.1); }
          100% { transform: scale(1.2); }
        }
      `}</style>
        </div>
    );
};

export default RoomDetails;
