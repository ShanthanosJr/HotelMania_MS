import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { api } from '../../utils/api';

const heroImage =
    'https://images.pexels.com/photos/271639/pexels-photo-271639.jpeg?auto=compress&cs=tinysrgb&w=1600';

type RoomTypeFromApi = {
    _id: string;
    name: string;
    photos?: string[];
    description: string;
    size?: number;
    maxGuests?: number;
    bedType?: string;
    view?: string;
    pricePerNight?: number;
    tag?: string;
    highlights?: string[];
    amenities?: string[];
    hotel?: { _id?: string } | string;
};

type RoomTypeTransformed = {
    id: string;
    name: string;
    slug: string;
    image: string;
    shortDescription: string;
    description: string;
    size: number;
    maxGuests: number;
    bedType: string;
    view: string;
    priceFrom: number;
    tag: string;
    highlights: string[];
    amenities: string[];
    hotel?: { _id?: string } | string;
};

type RoomInstance = {
    _id?: string;
    id?: string;
    roomNumber?: string;
    status?: string;
    type?:
    | {
        _id?: string;
        name?: string;
        basePrice?: number;
        maxOccupancy?: number;
    }
    | string;
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

const Rooms: React.FC = () => {
    // Animation Variants
    const fadeInUp = {
        hidden: { opacity: 0, y: 40 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
    };

    const stagger = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
    };

    const [roomsData, setRoomsData] = useState<RoomTypeTransformed[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [occupancyFilter, setOccupancyFilter] = useState<'any' | '1' | '2' | '3' | '4'>('any');
    const [viewFilter, setViewFilter] = useState<'any' | 'city' | 'garden' | 'river'>('any');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Pagination state for Room Gallery
    const [currentPage, setCurrentPage] = useState(1);
    const roomsPerPage = 6; // Show 6 rooms per page

    // booking state
    const [showModal, setShowModal] = useState(false);
    const [selectedRoomType, setSelectedRoomType] = useState<RoomTypeTransformed | null>(null);
    const [availableRooms, setAvailableRooms] = useState<RoomInstance[]>([]);
    const [loadingRooms, setLoadingRooms] = useState(false);
    const [bookingDates, setBookingDates] = useState<BookingDates>({
        checkInDate: '',
        checkOutDate: '',
    });
    const [paymentMethod, setPaymentMethod] = useState<
        'credit_card' | 'debit_card' | 'bank_transfer' | 'cash'
    >('credit_card');
    const [cardDetails, setCardDetails] = useState<CardDetails>({
        cardNumber: '',
        expiryDate: '',
        cvv: '',
    });
    const [isProcessing, setIsProcessing] = useState(false);

    // fetch room types
    useEffect(() => {
        const fetchRooms = async () => {
            try {
                setLoading(true);
                const response = await api.get('/api/room-types');

                if (!response.ok) {
                    throw new Error('Failed to fetch rooms');
                }

                const data = await response.json();
                if (data.success) {
                    const transformedRooms: RoomTypeTransformed[] = (data.data as RoomTypeFromApi[]).map(
                        room => ({
                            id: room._id,
                            name: room.name,
                            slug: room.name.toLowerCase().replace(/\s+/g, '-'),
                            image:
                                room.photos && room.photos.length > 0
                                    ? room.photos[0]
                                    : heroImage,
                            shortDescription: room.description,
                            description: room.description,
                            size: room.size || 30,
                            maxGuests: room.maxGuests || 2,
                            bedType: room.bedType || 'Queen Bed',
                            view: room.view || 'City View',
                            priceFrom: room.pricePerNight || 100,
                            tag: room.tag || '',
                            highlights: room.highlights || [],
                            amenities: room.amenities || [],
                            hotel: room.hotel,
                        }),
                    );
                    setRoomsData(transformedRooms);
                    setActiveIndex(0);
                }
            } catch (err: unknown) {
                const message =
                    err && typeof err === 'object' && 'message' in err
                        ? String((err as Error).message)
                        : 'Unknown error';
                setError(message);
                console.error('Error fetching rooms:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchRooms();
    }, []);

    const activeRoom = roomsData[activeIndex];

    const nextRoom = () => {
        if (!roomsData.length) return;
        setActiveIndex(prev => (prev + 1) % roomsData.length);
    };

    const prevRoom = () => {
        if (!roomsData.length) return;
        setActiveIndex(prev => (prev - 1 + roomsData.length) % roomsData.length);
    };

    const filteredRooms = useMemo(() => {
        if (!roomsData || roomsData.length === 0) return [];
        return roomsData.filter(room => {
            let ok = true;
            if (occupancyFilter !== 'any') {
                const guests = parseInt(occupancyFilter, 10);
                ok = ok && room.maxGuests >= guests;
            }
            if (viewFilter !== 'any') {
                ok = ok && room.view.toLowerCase().includes(viewFilter.toLowerCase());
            }
            return ok;
        });
    }, [roomsData, occupancyFilter, viewFilter]);

    // Pagination calculations
    const totalRooms = filteredRooms.length;
    const totalPages = Math.ceil(totalRooms / roomsPerPage);
    const startIndex = (currentPage - 1) * roomsPerPage;
    const paginatedRooms = filteredRooms.slice(startIndex, startIndex + roomsPerPage);

    const handleQuickSelect = (id: string) => {
        const index = roomsData.findIndex(r => r.id === id);
        if (index >= 0) setActiveIndex(index);
    };

    // modal & booking

    const openModal = async (roomType: RoomTypeTransformed) => {
        setSelectedRoomType(roomType);
        setLoadingRooms(true);
        setShowModal(true);
        setAvailableRooms([]);

        try {
            if (!roomType.hotel) {
                throw new Error('Hotel information missing for this room type');
            }
            const hotelId =
                typeof roomType.hotel === 'string' ? roomType.hotel : roomType.hotel._id || roomType.hotel;

            const response = await api.get(`/api/rooms?hotel=${hotelId}`);

            if (!response.ok) {
                throw new Error('Failed to fetch rooms');
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error('Failed to get rooms data');
            }

            const matchingRooms: RoomInstance[] = data.data.filter(
                (r: RoomInstance) =>
                    (typeof r.type !== 'string' && r.type?._id === roomType.id) || r.type === roomType.id,
            );

            setAvailableRooms(matchingRooms);
        } catch (err) {
            console.error('Error fetching rooms:', err);
            setAvailableRooms([]);
        } finally {
            setLoadingRooms(false);
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedRoomType(null);
        setAvailableRooms([]);
    };

    const initiateBooking = async (room: RoomInstance) => {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please log in to make a booking');
            window.location.href = '/login';
            return;
        }

        if (!bookingDates.checkInDate || !bookingDates.checkOutDate) {
            alert('Please select check-in and check-out dates');
            return;
        }

        if (paymentMethod === 'credit_card' || paymentMethod === 'debit_card') {
            if (!cardDetails.cardNumber || !cardDetails.expiryDate || !cardDetails.cvv) {
                alert('Please enter all card details');
                return;
            }
        }

        setIsProcessing(true);

        const checkIn = new Date(bookingDates.checkInDate);
        const checkOut = new Date(bookingDates.checkOutDate);
        const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

        const basePrice =
            typeof room.type !== 'string' && room.type?.basePrice ? room.type.basePrice : 0;

        const totalPrice = nights * basePrice;

        const roomId = room._id || room.id;

        const bookingData = {
            room: roomId,
            checkInDate: bookingDates.checkInDate,
            checkOutDate: bookingDates.checkOutDate,
            totalPrice,
        };

        try {
            const response = await api.post('/api/bookings', bookingData);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error((errorData && errorData.message) || 'Booking failed');
            }

            const bookingResult = await response.json();
            const bookingId: string = bookingResult.data._id;

            const transactionData = {
                booking: bookingId,
                amount: totalPrice,
                type: paymentMethod,
                transactionId: `TXN-${Date.now()}`,
                paymentDetails:
                    paymentMethod === 'credit_card' || paymentMethod === 'debit_card'
                        ? cardDetails
                        : undefined,
            };

            const txnResponse = await api.post('/api/transactions', transactionData);

            if (txnResponse.ok) {
                alert(`Booking successful! Booking ID: ${bookingId}`);
                closeModal();
                window.location.href = '/bookings';
            } else {
                console.error('Transaction creation failed');
                alert(
                    `Booking created (ID: ${bookingId}), but transaction record failed. Please contact support.`,
                );
                closeModal();
                window.location.href = '/bookings';
            }
        } catch (err: unknown) {
            console.error('Booking/Transaction error:', err);
            const message =
                err && typeof err === 'object' && 'message' in err
                    ? String((err as Error).message)
                    : 'Processing failed';
            alert(`Error: ${message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FDF8F3] dark:bg-[#121212] text-[#2C2416] dark:text-[#F5F0E6] font-[Lato,sans-serif] transition-colors duration-300">
            <Navbar />

            {loading && (
                <div className="py-32 text-center text-sm text-[#6B5B4F] dark:text-gray-300">Loading rooms...</div>
            )}
            {error && (
                <div className="py-32 text-center text-sm text-red-700 dark:text-red-400">Error: {error}</div>
            )}

            {!loading && !error && roomsData.length === 0 && (
                <div className="max-w-[1400px] mx-auto px-6 py-24 text-center">
                    <h2
                        className="text-2xl md:text-3xl mb-2 text-[#2C2416] dark:text-[#F5F0E6]"
                        style={{ fontFamily: 'Playfair Display, serif' }}
                    >
                        No rooms found
                    </h2>
                    <p className="text-sm text-[#6B5B4F] dark:text-gray-300">Please check back later.</p>
                </div>
            )}

            {!loading && !error && roomsData.length > 0 && activeRoom && (
                <>
                    {/* HERO */}
                    <section className="relative min-h-[480px] relative overflow-hidden">
                        <div
                            className="absolute inset-0 bg-cover bg-center scale-[1.08] animate-[roomsHeroZoom_18s_ease-in-out_infinite_alternate]"
                            style={{ backgroundImage: `url(${heroImage})` }}
                        />
                        <div className="absolute inset-0 bg-[linear-gradient(125deg,rgba(44,36,22,0.9)_0%,rgba(139,105,20,0.82)_45%,rgba(184,212,227,0.25)_100%)]" />
                        <motion.div
                            className="relative z-10 max-w-[1400px] mx-auto px-6 py-24 text-white dark:text-[#F5F0E6]"
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            variants={stagger}
                        >
                            <motion.p
                                className="text-[0.85rem] font-semibold tracking-[0.18em] uppercase text-[#E8DCC8] dark:text-[#A8A29E] mb-2 mt-10"
                                variants={fadeInUp}
                            >
                                Our Rooms &amp; Suites
                            </motion.p>
                            <motion.h1
                                className="text-3xl md:text-4xl lg:text-[3.2rem] font-semibold mb-4 text-white dark:text-[#F5F0E6]"
                                style={{ fontFamily: 'Playfair Display, serif' }}
                                variants={fadeInUp}
                            >
                                Choose Your Perfect Stay
                            </motion.h1>
                            <motion.p
                                className="max-w-xl text-[0.98rem] leading-7 text-[#F5F0E6] dark:text-gray-300 mb-6"
                                variants={fadeInUp}
                            >
                                From cozy business rooms to expansive suites, each space blends contemporary
                                comfort with timeless Grand Vista character.
                            </motion.p>
                            <motion.div
                                className="flex flex-wrap gap-7"
                                variants={stagger}
                            >
                                <motion.div className="flex flex-col gap-1" variants={fadeInUp}>
                                    <span
                                        className="text-[1.7rem] font-semibold text-[#E8DCC8] dark:text-[#D4AF37]"
                                        style={{ fontFamily: 'Playfair Display, serif' }}
                                    >
                                        {roomsData.length}
                                    </span>
                                    <span className="text-[0.8rem] uppercase tracking-[0.11em] text-[#D4C4A8] dark:text-gray-400">
                                        Room Categories
                                    </span>
                                </motion.div>
                                <motion.div className="flex flex-col gap-1" variants={fadeInUp}>
                                    <span
                                        className="text-[1.7rem] font-semibold text-[#E8DCC8] dark:text-[#D4AF37]"
                                        style={{ fontFamily: 'Playfair Display, serif' }}
                                    >
                                        3–5
                                    </span>
                                    <span className="text-[0.8rem] uppercase tracking-[0.11em] text-[#D4C4A8] dark:text-gray-400">
                                        Guests per Room
                                    </span>
                                </motion.div>
                                <motion.div className="flex flex-col gap-1" variants={fadeInUp}>
                                    <span
                                        className="text-[1.7rem] font-semibold text-[#E8DCC8] dark:text-[#D4AF37]"
                                        style={{ fontFamily: 'Playfair Display, serif' }}
                                    >
                                        24/7
                                    </span>
                                    <span className="text-[0.8rem] uppercase tracking-[0.11em] text-[#D4C4A8] dark:text-gray-400">
                                        Concierge Support
                                    </span>
                                </motion.div>
                            </motion.div>
                        </motion.div>
                    </section>

                    {/* INTRO / FILTERS */}
                    <motion.section
                        className="py-12 bg-[#FDF8F3] dark:bg-[#121212]"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-50px" }}
                        variants={stagger}
                    >
                        <div className="max-w-[1400px] mx-auto px-6 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                            <motion.div className="max-w-xl" variants={fadeInUp}>
                                <h2
                                    className="text-2xl md:text-[2rem] mb-2 text-[#2C2416] dark:text-[#F5F0E6]"
                                    style={{ fontFamily: 'Playfair Display, serif' }}
                                >
                                    Thoughtfully Crafted Spaces
                                </h2>
                                <p className="text-[0.95rem] text-[#6B5B4F] dark:text-gray-300">
                                    Every room has been designed to balance relaxation and functionality. Refine
                                    your options based on how you travel and who you are travelling with.
                                </p>
                            </motion.div>
                            <motion.div className="flex flex-wrap gap-4" variants={fadeInUp}>
                                <div className="flex flex-col gap-1 min-w-[160px]">
                                    <label className="text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-[#6B5B4F] dark:text-gray-300">
                                        Guests
                                    </label>
                                    <select
                                        value={occupancyFilter}
                                        onChange={e => {
                                            setOccupancyFilter(e.target.value as 'any' | '1' | '2' | '3' | '4');
                                            setCurrentPage(1); // Reset to first page when filter changes
                                        }}
                                        className="rounded bg-[#F5F0E6] dark:bg-[#2A2A2A] border border-[#D4C4A8] dark:border-[#444] px-3 py-2.5 text-[0.9rem] text-[#2C2416] dark:text-white focus:outline-none focus:border-[#8B6914] dark:focus:border-[#D4AF37] focus:bg-white dark:focus:bg-[#333] transition"
                                    >
                                        <option value="any">Any</option>
                                        <option value="1">1+ Guests</option>
                                        <option value="2">2+ Guests</option>
                                        <option value="3">3+ Guests</option>
                                        <option value="4">4+ Guests</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1 min-w-[160px]">
                                    <label className="text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-[#6B5B4F] dark:text-gray-300">
                                        Preferred View
                                    </label>
                                    <select
                                        value={viewFilter}
                                        onChange={e => {
                                            setViewFilter(e.target.value as 'any' | 'city' | 'garden' | 'river');
                                            setCurrentPage(1); // Reset to first page when filter changes
                                        }}
                                        className="rounded bg-[#F5F0E6] dark:bg-[#2A2A2A] border border-[#D4C4A8] dark:border-[#444] px-3 py-2.5 text-[0.9rem] text-[#2C2416] dark:text-white focus:outline-none focus:border-[#8B6914] dark:focus:border-[#D4AF37] focus:bg-white dark:focus:bg-[#333] transition"
                                    >
                                        <option value="any">Any</option>
                                        <option value="city">City</option>
                                        <option value="garden">Garden</option>
                                        <option value="river">River</option>
                                    </select>
                                </div>
                            </motion.div>
                        </div>
                    </motion.section>

                    {/* CAROUSEL */}
                    <section className="py-16 bg-[#F5F0E6] dark:bg-[#1E1E1E]">
                        <motion.div
                            className="max-w-[1400px] mx-auto px-6"
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: "-100px" }}
                            variants={stagger}
                        >
                            <motion.div className="max-w-xl mb-7" variants={fadeInUp}>
                                <p className="text-[0.85rem] font-semibold uppercase tracking-[0.18em] text-[#8B6914] dark:text-[#D4AF37] mb-2">
                                    Room Selector
                                </p>
                                <h2
                                    className="text-2xl md:text-[2.1rem] mb-2 text-[#2C2416] dark:text-[#F5F0E6]"
                                    style={{ fontFamily: 'Playfair Display, serif' }}
                                >
                                    Slide Through Our Signature Rooms
                                </h2>
                                <p className="text-[0.95rem] text-[#6B5B4F] dark:text-gray-300">
                                    Use the arrows to browse through the main room categories. Each card reveals
                                    key details at a glance so you can quickly compare.
                                </p>
                            </motion.div>

                            <motion.div className="flex items-center" variants={fadeInUp}>
                                <button
                                    type="button"
                                    onClick={prevRoom}
                                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-[#2A2A2A] text-[#8B6914] dark:text-[#D4AF37] shadow-md text-xl hover:bg-[#8B6914] hover:text-white dark:hover:bg-[#D4AF37] dark:hover:text-black transition mr-2"
                                >
                                    ‹
                                </button>

                                <div className="relative flex-1 h-[320px] flex items-center overflow-hidden">
                                    {roomsData.map((room, index) => {
                                        const isActive = index === activeIndex;
                                        let positionClass = 'opacity-0 pointer-events-none z-0';
                                        if (isActive) {
                                            positionClass =
                                                'left-[20%] right-[20%] opacity-100 z-10 scale-100 shadow-[0_12px_40px_rgba(92,64,51,0.2)]';
                                        } else if (index === (activeIndex - 1 + roomsData.length) % roomsData.length) {
                                            positionClass =
                                                'left-0 opacity-70 z-5 -translate-x-[18%] scale-[0.9]';
                                        } else if (index === (activeIndex + 1) % roomsData.length) {
                                            positionClass =
                                                'right-0 opacity-70 z-5 translate-x-[18%] scale-[0.9]';
                                        }

                                        return (
                                            <article
                                                key={room.id}
                                                className={`absolute top-0 bottom-0 w-[60%] max-w-[620px] m-auto bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-[0_4px_20px_rgba(92,64,51,0.1)] flex flex-col overflow-hidden cursor-pointer transform transition-all duration-400 ${positionClass}`}
                                                onClick={() => setActiveIndex(index)}
                                            >
                                                <div className="relative h-[170px] overflow-hidden">
                                                    <img
                                                        src={room.image}
                                                        alt={room.name}
                                                        className={`h-full w-full object-cover transition-transform duration-[800ms] ${isActive ? '' : 'blur-[2px] opacity-80'
                                                            }`}
                                                    />
                                                    {room.tag && (
                                                        <span className="absolute top-4 left-4 rounded-full bg-[#8B6914] dark:bg-[#D4AF37] px-3 py-1 text-[0.75rem] uppercase tracking-[0.12em] text-white dark:text-black">
                                                            {room.tag}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="px-5 pt-4 pb-3">
                                                    <h3
                                                        className="text-[1.35rem] mb-1 text-[#2C2416] dark:text-[#F5F0E6]"
                                                        style={{ fontFamily: 'Playfair Display, serif' }}
                                                    >
                                                        {room.name}
                                                    </h3>
                                                    <p className="text-[0.85rem] text-[#6B5B4F] dark:text-gray-300 mb-2">
                                                        {room.bedType} • up to {room.maxGuests} guests • {room.view}
                                                    </p>
                                                    <p className="text-[0.9rem] text-[#6B5B4F] dark:text-gray-300 leading-7">
                                                        {room.shortDescription}
                                                    </p>
                                                    <div className="mt-3 pt-2 border-t border-[#E8DCC8] dark:border-gray-600 flex items-center justify-between gap-3">
                                                        <div className="flex flex-col">
                                                            <span
                                                                className="text-[1.3rem] text-[#8B6914] dark:text-[#D4AF37]"
                                                                style={{ fontFamily: 'Playfair Display, serif' }}
                                                            >
                                                                ${room.priceFrom}
                                                            </span>
                                                            <span className="text-[0.8rem] text-[#6B5B4F] dark:text-gray-400">per night</span>
                                                        </div>
                                                        {isActive && (
                                                            <button
                                                                type="button"
                                                                onClick={e => {
                                                                    e.stopPropagation();
                                                                    openModal(room);
                                                                }}
                                                                className="px-5 py-2 border-2 border-[#8B6914] dark:border-[#D4AF37] bg-[#8B6914] dark:bg-[#D4AF37] text-white dark:text-black text-[0.8rem] font-semibold uppercase tracking-[0.14em] rounded hover:bg-transparent hover:text-[#8B6914] dark:hover:bg-[#D4AF37] dark:hover:text-black transition"
                                                            >
                                                                Select Room
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>

                                <button
                                    type="button"
                                    onClick={nextRoom}
                                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-[#2A2A2A] text-[#8B6914] dark:text-[#D4AF37] shadow-md text-xl hover:bg-[#8B6914] hover:text-white dark:hover:bg-[#D4AF37] dark:hover:text-black transition ml-2"
                                >
                                    ›
                                </button>
                            </motion.div>

                            <motion.div className="mt-4 flex flex-wrap gap-2" variants={fadeInUp}>
                                {roomsData.map(room => (
                                    <button
                                        key={room.id}
                                        type="button"
                                        onClick={() => handleQuickSelect(room.id)}
                                        className={`rounded-full border px-3 py-1.5 text-[0.8rem] tracking-[0.12em] transition ${room.id === activeRoom.id
                                            ? 'border-[#8B6914] dark:border-[#D4AF37] bg-[#8B6914] dark:bg-[#D4AF37] text-white dark:text-black'
                                            : 'border-[#D4C4A8] dark:border-gray-600 bg-white dark:bg-[#2A2A2A] text-[#6B5B4F] dark:text-gray-300 hover:border-[#8B6914] hover:bg-[#8B6914] hover:text-white dark:hover:bg-[#D4AF37] dark:hover:text-black'
                                            }`}
                                    >
                                        {room.name}
                                    </button>
                                ))}
                            </motion.div>
                        </motion.div>
                    </section>

                    {/* ACTIVE ROOM DETAILS */}
                    <motion.section
                        className="py-16 bg-[#FDF8F3] dark:bg-[#121212]"
                        key={activeRoom.id} // Re-animate on room change if desires, or remove key to animate once
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={stagger}
                    >
                        <div className="max-w-[1400px] mx-auto px-6 grid gap-9 md:grid-cols-[2.1fr,1.1fr] items-start">
                            <motion.div variants={fadeInUp}>
                                <p className="text-[0.85rem] font-semibold uppercase tracking-[0.18em] text-[#8B6914] dark:text-[#D4AF37] mb-2">
                                    Room Overview
                                </p>
                                <h2
                                    className="text-2xl md:text-[2rem] mb-3 text-[#2C2416] dark:text-[#F5F0E6]"
                                    style={{ fontFamily: 'Playfair Display, serif' }}
                                >
                                    {activeRoom.name}
                                </h2>
                                <p className="text-[0.95rem] text-[#6B5B4F] dark:text-gray-300 mb-6 max-w-xl">
                                    {activeRoom.description}
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <h3 className="text-[0.95rem] font-semibold mb-1 text-[#2C2416] dark:text-[#F5F0E6]">Size</h3>
                                        <p className="text-[0.9rem] text-[#6B5B4F] dark:text-gray-300">
                                            {activeRoom.size} m²
                                        </p>
                                    </div>
                                    <div>
                                        <h3 className="text-[0.95rem] font-semibold mb-1 text-[#2C2416] dark:text-[#F5F0E6]">Guests</h3>
                                        <p className="text-[0.9rem] text-[#6B5B4F] dark:text-gray-300">
                                            Up to {activeRoom.maxGuests} guests
                                        </p>
                                    </div>
                                    <div>
                                        <h3 className="text-[0.95rem] font-semibold mb-1 text-[#2C2416] dark:text-[#F5F0E6]">Bed</h3>
                                        <p className="text-[0.9rem] text-[#6B5B4F] dark:text-gray-300">
                                            {activeRoom.bedType}
                                        </p>
                                    </div>
                                    <div>
                                        <h3 className="text-[0.95rem] font-semibold mb-1 text-[#2C2416] dark:text-[#F5F0E6]">View</h3>
                                        <p className="text-[0.9rem] text-[#6B5B4F] dark:text-gray-300">
                                            {activeRoom.view}
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-[0.95rem] font-semibold mb-2 text-[#2C2416] dark:text-[#F5F0E6]">Stay Highlights</h3>
                                    <ul className="space-y-1.5">
                                        {activeRoom.highlights.map(item => (
                                            <li
                                                key={item}
                                                className="text-[0.9rem] text-[#6B5B4F] dark:text-gray-300 pl-4 relative"
                                            >
                                                <span className="absolute left-0 top-1 text-[#8B6914] dark:text-[#D4AF37]">•</span>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </motion.div>

                            <motion.aside className="flex justify-end" variants={fadeInUp}>
                                <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#1E1E1E] shadow-[0_8px_30px_rgba(92,64,51,0.15)] px-5 py-5">
                                    <h3
                                        className="text-[1.25rem] mb-2 text-[#2C2416] dark:text-[#F5F0E6]"
                                        style={{ fontFamily: 'Playfair Display, serif' }}
                                    >
                                        Ready to Reserve?
                                    </h3>
                                    <p className="text-[0.9rem] text-[#6B5B4F] dark:text-gray-300 mb-3">
                                        Once connected to the backend, you will see live availability, nightly
                                        rates, and offers for this room type.
                                    </p>
                                    <div className="flex flex-col gap-1 mb-3">
                                        <span
                                            className="text-[1.5rem] text-[#8B6914] dark:text-[#D4AF37]"
                                            style={{ fontFamily: 'Playfair Display, serif' }}
                                        >
                                            ${activeRoom.priceFrom}
                                        </span>
                                        <span className="text-[0.8rem] text-[#6B5B4F] dark:text-gray-400">
                                            starting nightly rate
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => openModal(activeRoom)}
                                        className="mb-2 w-full px-5 py-3 border-2 border-[#8B6914] dark:border-[#D4AF37] bg-[#8B6914] dark:bg-[#D4AF37] text-white dark:text-black text-[0.8rem] font-semibold uppercase tracking-[0.16em] rounded hover:bg-transparent hover:text-[#8B6914] dark:hover:bg-[#D4AF37] dark:hover:text-black transition"
                                    >
                                        Proceed to Booking
                                    </button>
                                    <p className="text-[0.8rem] text-[#6B5B4F] dark:text-gray-400">
                                        You can change your selected room or add special requests on the booking
                                        page.
                                    </p>
                                </div>
                            </motion.aside>
                        </div>
                    </motion.section>

                    {/* GALLERY GRID */}
                    <motion.section
                        className="py-16 bg-[#F5F0E6] dark:bg-[#1E1E1E]"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={stagger}
                    >
                        <motion.div
                            className="max-w-[1400px] mx-auto px-6"
                            variants={fadeInUp}
                        >
                            <motion.div className="text-center max-w-xl mx-auto mb-8" variants={fadeInUp}>
                                <p className="text-[0.85rem] font-semibold uppercase tracking-[0.18em] text-[#8B6914] dark:text-[#D4AF37] mb-2">
                                    Room Gallery
                                </p>
                                <h2
                                    className="text-2xl md:text-[2rem] mb-2 text-[#2C2416] dark:text-[#F5F0E6]"
                                    style={{ fontFamily: 'Playfair Display, serif' }}
                                >
                                    Explore All Categories
                                </h2>
                                <p className="text-[0.95rem] text-[#6B5B4F] dark:text-gray-300">
                                    Browse every room at a glance. Each card reveals key features so you can
                                    compare and shortlist before reserving.
                                </p>
                            </motion.div>

                            <motion.div className="grid gap-6 md:grid-cols-3 mb-8" variants={stagger}>
                                {paginatedRooms.map(room => (
                                    <motion.article
                                        key={room.id}
                                        className="flex flex-col rounded-[14px] bg-white dark:bg-[#1E1E1E] shadow-[0_4px_20px_rgba(92,64,51,0.1)] overflow-hidden cursor-pointer transition-transform duration-300 hover:-translate-y-1.5 hover:shadow-[0_12px_40px_rgba(92,64,51,0.2)]"
                                        onClick={() => handleQuickSelect(room.id)}
                                        variants={fadeInUp}
                                    >
                                        <div className="relative h-[190px] overflow-hidden">
                                            <img
                                                src={room.image}
                                                alt={room.name}
                                                className="h-full w-full object-cover transition-transform duration-[800ms] group-hover:scale-[1.06]"
                                            />
                                            {room.tag && (
                                                <span className="absolute top-4 left-4 rounded-full bg-[#8B6914] dark:bg-[#D4AF37] px-3 py-1 text-[0.75rem] uppercase tracking-[0.12em] text-white dark:text-black">
                                                    {room.tag}
                                                </span>
                                            )}
                                        </div>
                                        <div className="px-5 pt-4 pb-3">
                                            <h3
                                                className="text-[1.2rem] mb-1 text-[#2C2416] dark:text-[#F5F0E6]"
                                                style={{ fontFamily: 'Playfair Display, serif' }}
                                            >
                                                {room.name}
                                            </h3>
                                            <p className="text-[0.85rem] text-[#6B5B4F] dark:text-gray-300 mb-2">
                                                {room.bedType} • up to {room.maxGuests} guests • {room.view}
                                            </p>
                                            <p className="text-[0.9rem] text-[#6B5B4F] dark:text-gray-300 leading-7">
                                                {room.shortDescription}
                                            </p>
                                            <div className="mt-3 pt-2 border-t border-[#E8DCC8] dark:border-gray-600 flex items-center justify-between gap-3">
                                                <div className="flex flex-col">
                                                    <span
                                                        className="text-[1.2rem] text-[#8B6914] dark:text-[#D4AF37]"
                                                        style={{ fontFamily: 'Playfair Display, serif' }}
                                                    >
                                                        ${room.priceFrom}
                                                    </span>
                                                    <span className="text-[0.8rem] text-[#6B5B4F] dark:text-gray-400">per night</span>
                                                </div>
                                                <Link
                                                    to={`/room/${room.id}`}
                                                    className="inline-flex justify-center px-5 py-2 border border-[#D4C4A8] dark:border-gray-600 bg-[#F5F0E6] dark:bg-[#2A2A2A] text-[#8B6914] dark:text-[#D4AF37] text-[0.8rem] font-semibold uppercase tracking-[0.14em] rounded hover:bg-[#8B6914] hover:text-white dark:hover:bg-[#D4AF37] dark:hover:text-black transition"
                                                >
                                                    View Details
                                                </Link>
                                            </div>
                                        </div>
                                    </motion.article>
                                ))}
                            </motion.div>

                            {/* Pagination Controls */}
                            <motion.div className="flex flex-col items-center" variants={fadeInUp}>
                                <div className="flex items-center gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className={`px-4 py-2 rounded border ${currentPage === 1 ? 'border-[#D4C4A8] dark:border-gray-600 bg-[#F5F0E6] dark:bg-[#2A2A2A] text-[#6B5B4F] dark:text-gray-300 cursor-not-allowed' : 'border-[#8B6914] dark:border-[#D4AF37] bg-[#8B6914] dark:bg-[#D4AF37] text-white dark:text-black hover:bg-transparent hover:text-[#8B6914] dark:hover:bg-[#D4AF37] dark:hover:text-black'}`}
                                    >
                                        Previous
                                    </button>

                                    <span className="text-[#2C2416] dark:text-[#F5F0E6]">
                                        <span className="font-semibold">{Math.min(startIndex + 1, totalRooms)}-{Math.min(startIndex + roomsPerPage, totalRooms)}</span> of <span className="font-semibold">{totalRooms}</span>
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages || totalPages === 0}
                                        className={`px-4 py-2 rounded border ${currentPage === totalPages || totalPages === 0 ? 'border-[#D4C4A8] dark:border-gray-600 bg-[#F5F0E6] dark:bg-[#2A2A2A] text-[#6B5B4F] dark:text-gray-300 cursor-not-allowed' : 'border-[#8B6914] dark:border-[#D4AF37] bg-[#8B6914] dark:bg-[#D4AF37] text-white dark:text-black hover:bg-transparent hover:text-[#8B6914] dark:hover:bg-[#D4AF37] dark:hover:text-black'}`}
                                    >
                                        Next
                                    </button>
                                </div>

                                <div className="mt-4 flex gap-2">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                        <button
                                            key={page}
                                            type="button"
                                            onClick={() => setCurrentPage(page)}
                                            className={`w-10 h-10 rounded-full ${currentPage === page ? 'bg-[#8B6914] dark:bg-[#D4AF37] text-white dark:text-black' : 'border border-[#8B6914] dark:border-[#D4AF37] text-[#8B6914] dark:text-[#D4AF37] hover:bg-[#8B6914] hover:text-white dark:hover:bg-[#D4AF37] dark:hover:text-black'}`}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        </motion.div>
                    </motion.section>

                    {/* MODAL */}
                    {showModal && selectedRoomType && (
                        <div
                            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4"
                            onClick={closeModal}
                        >
                            <div
                                className="w-full max-w-3xl rounded-2xl bg-white dark:bg-[#1E1E1E] shadow-2xl max-h-[90vh] overflow-y-auto"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between border-b border-[#E8DCC8] dark:border-gray-600 px-6 py-4">
                                    <h2
                                        className="text-lg md:text-xl text-[#2C2416] dark:text-[#F5F0E6]"
                                        style={{ fontFamily: 'Playfair Display, serif' }}
                                    >
                                        {selectedRoomType.name} - Available Rooms
                                    </h2>
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="text-2xl leading-none text-[#6B5B4F] dark:text-gray-300 hover:text-[#8B6914] dark:hover:text-[#D4AF37]"
                                    >
                                        ×
                                    </button>
                                </div>

                                <div className="px-6 py-5">
                                    {loadingRooms ? (
                                        <div className="py-10 text-center text-sm text-[#6B5B4F] dark:text-gray-300">
                                            Loading available rooms...
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {availableRooms.length > 0 ? (
                                                availableRooms.map(room => {
                                                    const typeObj =
                                                        typeof room.type === 'string' ? undefined : room.type;
                                                    return (
                                                        <div
                                                            key={room._id || room.id}
                                                            className="flex flex-col md:flex-row gap-4 rounded-xl border border-[#E8DCC8] dark:border-gray-600 bg-[#FDF8F3] dark:bg-[#2A2A2A] p-4"
                                                        >
                                                            <div className="flex-1 space-y-2 text-[0.9rem] text-[#2C2416] dark:text-[#F5F0E6]">
                                                                <h4
                                                                    className="text-[1rem] font-semibold text-[#2C2416] dark:text-[#F5F0E6]"
                                                                    style={{ fontFamily: 'Playfair Display, serif' }}
                                                                >
                                                                    {typeObj?.name || selectedRoomType.name}
                                                                </h4>
                                                                <p>Room Number: {room.roomNumber || 'N/A'}</p>
                                                                <p>Status: {room.status || 'Available'}</p>
                                                                <p>
                                                                    Price:{' '}
                                                                    {typeObj?.basePrice
                                                                        ? `$${typeObj.basePrice}/night`
                                                                        : 'N/A'}
                                                                </p>
                                                                <p>
                                                                    Capacity:{' '}
                                                                    {typeObj?.maxOccupancy
                                                                        ? `${typeObj.maxOccupancy} guests`
                                                                        : 'N/A'}
                                                                </p>

                                                                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                                                    <div className="flex flex-col gap-1 text-[0.85rem]">
                                                                        <label className="font-semibold text-[#2C2416] dark:text-[#F5F0E6]">
                                                                            Check-in Date:
                                                                        </label>
                                                                        <input
                                                                            type="date"
                                                                            value={bookingDates.checkInDate}
                                                                            onChange={e =>
                                                                                setBookingDates(prev => ({
                                                                                    ...prev,
                                                                                    checkInDate: e.target.value,
                                                                                }))
                                                                            }
                                                                            min={new Date().toISOString().split('T')[0]}
                                                                            className="rounded border border-[#D4C4A8] dark:border-[#444] px-2 py-1.5 text-[0.85rem] text-[#2C2416] dark:text-white focus:outline-none focus:border-[#8B6914] dark:focus:border-[#D4AF37]"
                                                                        />
                                                                    </div>
                                                                    <div className="flex flex-col gap-1 text-[0.85rem]">
                                                                        <label className="font-semibold text-[#2C2416] dark:text-[#F5F0E6]">
                                                                            Check-out Date:
                                                                        </label>
                                                                        <input
                                                                            type="date"
                                                                            value={bookingDates.checkOutDate}
                                                                            onChange={e =>
                                                                                setBookingDates(prev => ({
                                                                                    ...prev,
                                                                                    checkOutDate: e.target.value,
                                                                                }))
                                                                            }
                                                                            min={
                                                                                bookingDates.checkInDate ||
                                                                                new Date().toISOString().split('T')[0]
                                                                            }
                                                                            className="rounded border border-[#D4C4A8] dark:border-[#444] px-2 py-1.5 text-[0.85rem] text-[#2C2416] dark:text-white focus:outline-none focus:border-[#8B6914] dark:focus:border-[#D4AF37]"
                                                                        />
                                                                    </div>
                                                                </div>

                                                                <div className="mt-3 flex flex-col gap-1 text-[0.85rem]">
                                                                    <label className="font-semibold text-[#2C2416] dark:text-[#F5F0E6]">
                                                                        Payment Method:
                                                                    </label>
                                                                    <select
                                                                        value={paymentMethod}
                                                                        onChange={e =>
                                                                            setPaymentMethod(
                                                                                e.target.value as
                                                                                | 'credit_card'
                                                                                | 'debit_card'
                                                                                | 'bank_transfer'
                                                                                | 'cash',
                                                                            )
                                                                        }
                                                                        className="w-full rounded border border-[#D4C4A8] dark:border-[#444] px-2 py-1.5 text-[0.85rem] text-[#2C2416] dark:text-white focus:outline-none focus:border-[#8B6914] dark:focus:border-[#D4AF37]"
                                                                    >
                                                                        <option value="credit_card">Credit Card</option>
                                                                        <option value="debit_card">Debit Card</option>
                                                                        <option value="bank_transfer">Bank Transfer</option>
                                                                        <option value="cash">Cash</option>
                                                                    </select>
                                                                </div>

                                                                {(paymentMethod === 'credit_card' ||
                                                                    paymentMethod === 'debit_card') && (
                                                                        <div className="mt-3 rounded bg-[#F5F0E6] dark:bg-[#2A2A2A] p-3 space-y-3">
                                                                            <div>
                                                                                <label className="mb-1 block text-[0.85rem] font-semibold text-[#2C2416] dark:text-[#F5F0E6]">
                                                                                    Card Number:
                                                                                </label>
                                                                                <input
                                                                                    type="text"
                                                                                    placeholder="1234 5678 9012 3456"
                                                                                    value={cardDetails.cardNumber}
                                                                                    onChange={e =>
                                                                                        setCardDetails(prev => ({
                                                                                            ...prev,
                                                                                            cardNumber: e.target.value,
                                                                                        }))
                                                                                    }
                                                                                    className="w-full rounded border border-[#D4C4A8] dark:border-[#444] px-2 py-1.5 text-[0.85rem] text-[#2C2416] dark:text-white focus:outline-none focus:border-[#8B6914] dark:focus:border-[#D4AF37]"
                                                                                />
                                                                            </div>
                                                                            <div className="flex gap-3">
                                                                                <div className="flex-1">
                                                                                    <label className="mb-1 block text-[0.85rem] font-semibold text-[#2C2416] dark:text-[#F5F0E6]">
                                                                                        Expiry Date:
                                                                                    </label>
                                                                                    <input
                                                                                        type="text"
                                                                                        placeholder="MM/YY"
                                                                                        value={cardDetails.expiryDate}
                                                                                        onChange={e =>
                                                                                            setCardDetails(prev => ({
                                                                                                ...prev,
                                                                                                expiryDate: e.target.value,
                                                                                            }))
                                                                                        }
                                                                                        className="w-full rounded border border-[#D4C4A8] dark:border-[#444] px-2 py-1.5 text-[0.85rem] text-[#2C2416] dark:text-white focus:outline-none focus:border-[#8B6914] dark:focus:border-[#D4AF37]"
                                                                                    />
                                                                                </div>
                                                                                <div className="flex-1">
                                                                                    <label className="mb-1 block text-[0.85rem] font-semibold text-[#2C2416] dark:text-[#F5F0E6]">
                                                                                        CVV:
                                                                                    </label>
                                                                                    <input
                                                                                        type="text"
                                                                                        placeholder="123"
                                                                                        value={cardDetails.cvv}
                                                                                        onChange={e =>
                                                                                            setCardDetails(prev => ({
                                                                                                ...prev,
                                                                                                cvv: e.target.value,
                                                                                            }))
                                                                                        }
                                                                                        className="w-full rounded border border-[#D4C4A8] dark:border-[#444] px-2 py-1.5 text-[0.85rem] text-[#2C2416] dark:text-white focus:outline-none focus:border-[#8B6914] dark:focus:border-[#D4AF37]"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                            </div>

                                                            <div className="flex items-center md:w-40">
                                                                <button
                                                                    type="button"
                                                                    disabled={isProcessing}
                                                                    onClick={() => initiateBooking(room)}
                                                                    className="w-full px-4 py-2.5 rounded border-2 border-[#8B6914] dark:border-[#D4AF37] bg-[#8B6914] dark:bg-[#D4AF37] text-white dark:text-black text-[0.8rem] font-semibold uppercase tracking-[0.14em] hover:bg-transparent hover:text-[#8B6914] dark:hover:bg-[#D4AF37] dark:hover:text-black transition disabled:opacity-60 disabled:cursor-not-allowed"
                                                                >
                                                                    {isProcessing ? 'Processing...' : 'Book Now'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <p className="text-sm text-[#6B5B4F] dark:text-gray-300">
                                                    No available physical rooms for this category. Please try another
                                                    hotel or contact support.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* keyframes */}
                    <style>{`
                        @keyframes roomsHeroZoom {
                            0% { transform: scale(1.1); }
                            100% { transform: scale(1.2); }
                        }
                    `}</style>
                </>
            )}

            <Footer />
        </div>
    );
};

export default Rooms;
