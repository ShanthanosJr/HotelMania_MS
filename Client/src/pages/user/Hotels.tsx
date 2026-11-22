import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { api } from '../../utils/api';
import { motion } from 'framer-motion';
import { bookUrl } from '../../utils/booking';

const heroImage =
    'https://images.pexels.com/photos/261102/pexels-photo-261102.jpeg?auto=compress&cs=tinysrgb&w=1600';
const fallbackHotelImage =
    'https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg?auto=compress&cs=tinysrgb&w=1200';

const mockFilters = {
    locations: ['Any Location', 'Colombo', 'Kandy', 'Galle', 'Ella'],
    starRatings: ['Any Rating', '5 Stars', '4 Stars', '3 Stars'],
    priceRanges: ['Any Price', '$50 - $150', '$150 - $300', '$300+'],
    amenities: ['Pool', 'Spa', 'Free WiFi', 'Parking', 'Gym'],
};

type Hotel = {
    _id?: string;
    id?: string;
    name: string;
    address: string;
    description: string;
    photos?: string[];
    tag?: string;
    rating: number;
    amenities: string[];
};

type Room = {
    _id?: string;
    id?: string;
    roomNumber?: string;
    status?: string;
    type?: {
        name?: string;
        basePrice?: number;
        maxOccupancy?: number;
    } | string;
};

type Filters = {
    location: string;
    starRating: string;
    priceRange: string;
    amenities: string[];
    search: string;
};


const applyFiltersAndSort = (
    hotels: Hotel[],
    currentFilters: Filters,
    sortOption: string,
): Hotel[] => {
    let result = [...hotels];

    if (currentFilters.location !== 'Any Location') {
        result = result.filter(h =>
            h.address.toLowerCase().includes(currentFilters.location.toLowerCase()),
        );
    }

    if (currentFilters.starRating !== 'Any Rating') {
        if (currentFilters.starRating === '5 Stars') {
            result = result.filter(h => h.rating >= 4.8);
        } else if (currentFilters.starRating === '4 Stars') {
            result = result.filter(h => h.rating >= 4.0 && h.rating < 4.8);
        } else if (currentFilters.starRating === '3 Stars') {
            result = result.filter(h => h.rating >= 3.0 && h.rating < 4.0);
        }
    }

    if (currentFilters.amenities.length > 0) {
        result = result.filter(hotel =>
            currentFilters.amenities.every(a => hotel.amenities.includes(a)),
        );
    }

    if (currentFilters.search.trim() !== '') {
        const query = currentFilters.search.toLowerCase();
        result = result.filter(
            h =>
                h.name.toLowerCase().includes(query) ||
                h.address.toLowerCase().includes(query),
        );
    }

    if (sortOption === 'Rating') {
        result.sort((a, b) => b.rating - a.rating);
    } else if (sortOption === 'Price (Low to High)' || sortOption === 'Price (High to Low)') {
        // no direct price at hotel level yet – leave as rating-based until backend supports
        result.sort((a, b) => b.rating - a.rating);
    } else {
        result.sort((a, b) => b.rating - a.rating);
    }

    return result;
};

const Hotels: React.FC = () => {
    const navigate = useNavigate();
    const [filters, setFilters] = useState<Filters>({
        location: 'Any Location',
        starRating: 'Any Rating',
        priceRange: 'Any Price',
        amenities: [],
        search: '',
    });

    const [sortedBy, setSortedBy] = useState('Recommended');
    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [, setRooms] = useState<Room[]>([]);
    const [visibleHotels, setVisibleHotels] = useState<Hotel[]>([]);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const hotelsPerPage = 6;



    // Animation Variants
    const fadeInUp = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
    };
    const stagger = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                const hotelsResponse = await api.get('/api/hotels');
                if (!hotelsResponse.ok) {
                    throw new Error('Failed to fetch hotels');
                }
                const hotelsData = await hotelsResponse.json();
                if (hotelsData.success) {
                    setHotels(hotelsData.data);
                    setVisibleHotels(hotelsData.data);
                }

                const roomsResponse = await api.get('/api/rooms');
                if (!roomsResponse.ok) {
                    throw new Error('Failed to fetch rooms');
                }
                const roomsData = await roomsResponse.json();
                if (roomsData.success) {
                    setRooms(roomsData.data);
                }
            } catch (err: unknown) {
                const message =
                    err && typeof err === 'object' && 'message' in err
                        ? String((err as Error).message)
                        : 'Unknown error';
                setError(message);
                console.error('Error fetching data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        setVisibleHotels(applyFiltersAndSort(hotels, filters, sortedBy));
        setCurrentPage(1);
    }, [filters, sortedBy, hotels]);

    const handleFilterChange = (field: keyof Filters, value: string) => {
        setFilters(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleAmenityToggle = (amenity: string) => {
        setFilters(prev => {
            const exists = prev.amenities.includes(amenity);
            return {
                ...prev,
                amenities: exists
                    ? prev.amenities.filter(a => a !== amenity)
                    : [...prev.amenities, amenity],
            };
        });
    };

    const handleSearchChange: React.ChangeEventHandler<HTMLInputElement> = e => {
        handleFilterChange('search', e.target.value);
    };

    const handleClearFilters = () => {
        setFilters({
            location: 'Any Location',
            starRating: 'Any Rating',
            priceRange: 'Any Price',
            amenities: [],
            search: '',
        });
        setSortedBy('Recommended');
    };

    const indexOfLastHotel = currentPage * hotelsPerPage;
    const indexOfFirstHotel = indexOfLastHotel - hotelsPerPage;
    const currentHotels = () => visibleHotels.slice(indexOfFirstHotel, indexOfLastHotel);
    const totalPages = () => Math.ceil(visibleHotels.length / hotelsPerPage);

    const goToPreviousPage = () => {
        if (currentPage > 1) {
            setCurrentPage(prev => prev - 1);
            document.querySelector('.hotels-results')?.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const openModal = (hotel: Hotel) => navigate(bookUrl({ hotel: hotel._id || hotel.id }));

    const goToNextPage = () => {
        if (currentPage < totalPages()) {
            setCurrentPage(prev => prev + 1);
            document.querySelector('.hotels-results')?.scrollIntoView({ behavior: 'smooth' });
        }
    };




    return (
        <div className="min-h-screen bg-ivory text-ink font-body dark:bg-night dark:text-cream transition-colors duration-300">
            <Navbar />

            {/* HERO */}
            <section className="relative flex min-h-[520px] items-center justify-center overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center scale-[1.08] animate-[roomsHeroZoom_18s_ease-in-out_infinite_alternate]"
                    style={{ backgroundImage: `url(${heroImage})` }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(44,36,22,0.92)_0%,rgba(139,105,20,0.82)_45%,rgba(184,212,227,0.25)_100%)]" />
                <motion.div
                    className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-col px-6 py-20 text-white"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={stagger}
                >
                    <motion.p
                        className="mb-3 text-[0.85rem] font-semibold uppercase tracking-[0.18em] text-sand dark:text-[#A8A29E]"
                        variants={fadeInUp}
                    >
                        Find Your Stay
                    </motion.p>
                    <motion.h1
                        className="mb-4 text-3xl md:text-4xl lg:text-[3rem] dark:text-cream"
                        style={{ fontFamily: 'Playfair Display, serif' }}
                        variants={fadeInUp}
                    >
                        Discover Exceptional Hotels
                    </motion.h1>
                    <motion.p
                        className="mb-7 max-w-xl text-[0.98rem] leading-7 text-cream dark:text-gray-300"
                        variants={fadeInUp}
                    >
                        Explore handpicked stays across Sri Lanka, from beachfront escapes to hill
                        country retreats, all curated to match your style and comfort.
                    </motion.p>
                    <motion.div className="flex flex-wrap gap-7" variants={stagger}>
                        <motion.div className="flex flex-col gap-1" variants={fadeInUp}>
                            <span
                                className="text-[1.6rem] text-sand dark:text-[#A8A29E]"
                                style={{ fontFamily: 'Playfair Display, serif' }}
                            >
                                120+
                            </span>
                            <span className="text-[0.8rem] uppercase tracking-[0.12em] text-wheat dark:text-gray-400">
                                Luxury &amp; Boutique Hotels
                            </span>
                        </motion.div>
                        <motion.div className="flex flex-col gap-1" variants={fadeInUp}>
                            <span
                                className="text-[1.6rem] text-sand dark:text-[#A8A29E]"
                                style={{ fontFamily: 'Playfair Display, serif' }}
                            >
                                4.7
                            </span>
                            <span className="text-[0.8rem] uppercase tracking-[0.12em] text-wheat dark:text-gray-400">
                                Average Guest Rating
                            </span>
                        </motion.div>
                        <motion.div className="flex flex-col gap-1" variants={fadeInUp}>
                            <span
                                className="text-[1.6rem] text-sand dark:text-[#A8A29E]"
                                style={{ fontFamily: 'Playfair Display, serif' }}
                            >
                                24/7
                            </span>
                            <span className="text-[0.8rem] uppercase tracking-[0.12em] text-wheat dark:text-gray-400">
                                Dedicated Support
                            </span>
                        </motion.div>
                    </motion.div>
                </motion.div>
            </section>

            {/* FILTERS + SORTING */}
            <section className="bg-ivory py-10 dark:bg-gray-900 dark:text-cream">
                <div className="mx-auto max-w-[1400px] px-6">
                    <div className="mb-5 flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
                        <h2
                            className="text-2xl md:text-[2rem] dark:text-cream"
                            style={{ fontFamily: 'Playfair Display, serif' }}
                        >
                            Tailor Your Hotel Search
                        </h2>
                        <button
                            type="button"
                            className="rounded border border-wheat bg-cream px-4 py-2 text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-bronze hover:bg-bronze hover:text-white transition md:hidden"
                            onClick={() => setIsFilterOpen(prev => !prev)}
                        >
                            {isFilterOpen ? 'Hide Filters' : 'Show Filters'}
                        </button>
                    </div>

                    <div
                        className={`grid gap-4 rounded-2xl bg-white p-4 shadow-[0_4px_20px_rgba(92,64,51,0.1)] md:grid-cols-4 md:items-end ${isFilterOpen ? 'grid' : 'hidden md:grid'
                            }`}
                    >
                        <div className="flex flex-col gap-1">
                            <label className="text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-taupe dark:text-gray-300">
                                Destination
                            </label>
                            <select
                                value={filters.location}
                                onChange={e => handleFilterChange('location', e.target.value)}
                                className="rounded border border-wheat bg-cream px-3 py-2.5 text-[0.9rem] text-ink focus:border-bronze focus:bg-white focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-cream dark:focus:border-gold"
                            >
                                {mockFilters.locations.map(option => (
                                    <option key={option}>{option}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-taupe dark:text-gray-300">
                                Star Rating
                            </label>
                            <select
                                value={filters.starRating}
                                onChange={e => handleFilterChange('starRating', e.target.value)}
                                className="rounded border border-wheat bg-cream px-3 py-2.5 text-[0.9rem] text-ink focus:border-bronze focus:bg-white focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-cream dark:focus:border-gold"
                            >
                                {mockFilters.starRatings.map(option => (
                                    <option key={option}>{option}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-taupe dark:text-gray-300">
                                Price Range
                            </label>
                            <select
                                value={filters.priceRange}
                                onChange={e => handleFilterChange('priceRange', e.target.value)}
                                className="rounded border border-wheat bg-cream px-3 py-2.5 text-[0.9rem] text-ink focus:border-bronze focus:bg-white focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-cream dark:focus:border-gold"
                            >
                                {mockFilters.priceRanges.map(option => (
                                    <option key={option}>{option}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1 md:col-span-1">
                            <label className="text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-taupe dark:text-gray-300">
                                Search
                            </label>
                            <input
                                type="text"
                                placeholder="Search by hotel or city"
                                value={filters.search}
                                onChange={handleSearchChange}
                                className="w-full rounded border border-wheat bg-cream px-3 py-2.5 text-[0.9rem] text-ink placeholder:text-[#B8A58B] focus:border-bronze focus:bg-white focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-cream dark:placeholder:text-gray-400 focus:dark:border-gold"
                            />
                        </div>

                        <div className="md:col-span-4">
                            <label className="mb-1 block text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-taupe dark:text-gray-300">
                                Amenities
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {mockFilters.amenities.map(a => {
                                    const active = filters.amenities.includes(a);
                                    return (
                                        <button
                                            key={a}
                                            type="button"
                                            onClick={() => handleAmenityToggle(a)}
                                            className={`rounded-full border px-3 py-1.5 text-[0.8rem] tracking-[0.08em] transition ${active
                                                ? 'border-bronze bg-bronze text-white'
                                                : 'border-wheat bg-cream text-taupe hover:border-bronze hover:bg-bronze hover:text-white'
                                                }`}
                                        >
                                            {a}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 md:col-span-4 md:flex-row md:items-center md:justify-between">
                            <button
                                type="button"
                                onClick={handleClearFilters}
                                className="rounded border border-wheat bg-cream px-4 py-2 text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-bronze hover:bg-bronze hover:text-white transition"
                            >
                                Clear Filters
                            </button>
                            <div className="flex items-center gap-2 text-[0.85rem] text-taupe dark:text-gray-300">
                                <span>Sort by</span>
                                <select
                                    value={sortedBy}
                                    onChange={e => setSortedBy(e.target.value)}
                                    className="rounded border border-wheat bg-cream px-3 py-1.5 text-[0.85rem] text-ink focus:border-bronze focus:bg-white focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-cream dark:focus:border-gold"
                                >
                                    <option>Recommended</option>
                                    <option>Price (Low to High)</option>
                                    <option>Price (High to Low)</option>
                                    <option>Rating</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* RESULTS */}
            <section id="hotel-results" className="hotels-results scroll-mt-20 bg-cream py-12 dark:bg-gray-800 dark:text-cream">
                <div className="mx-auto max-w-[1400px] px-6">
                    <div className="mb-6">
                        <p className="mb-1 text-[0.85rem] font-semibold uppercase tracking-[0.18em] text-bronze dark:text-gold">
                            Available Hotels
                        </p>
                        <h2
                            className="mb-2 text-2xl md:text-[2rem] dark:text-cream"
                            style={{ fontFamily: 'Playfair Display, serif' }}
                        >
                            {visibleHotels.length}{' '}
                            {visibleHotels.length === 1 ? 'Hotel' : 'Hotels'} Found
                        </h2>
                        <p className="max-w-xl text-[0.95rem] text-taupe dark:text-gray-300">
                            Refine your filters or sort options to discover the ideal stay that matches
                            your preferences.
                        </p>
                    </div>

                    {loading && (
                        <div className="py-16 text-center text-sm text-taupe dark:text-gray-300">
                            Loading hotels...
                        </div>
                    )}

                    {error && (
                        <div className="py-16 text-center text-sm text-red-700 dark:text-red-400">Error: {error}</div>
                    )}

                    {!loading && !error && visibleHotels.length === 0 && (
                        <motion.div
                            className="rounded-2xl bg-white px-6 py-10 text-center shadow-[0_8px_30px_rgba(92,64,51,0.12)] dark:bg-gray-800 dark:text-cream"
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            variants={fadeInUp}
                        >
                            <h3
                                className="mb-2 text-xl dark:text-cream"
                                style={{ fontFamily: 'Playfair Display, serif' }}
                            >
                                No hotels match your selection
                            </h3>
                            <p className="mb-4 text-[0.95rem] text-taupe dark:text-gray-300">
                                Try adjusting your filters or removing some amenities to see more available
                                stays.
                            </p>
                            <button
                                type="button"
                                onClick={handleClearFilters}
                                className="rounded border-2 border-bronze bg-bronze px-5 py-2.5 text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-white hover:bg-transparent hover:text-bronze transition"
                            >
                                Reset All Filters
                            </button>
                        </motion.div>
                    )}

                    {!loading && !error && visibleHotels.length > 0 && (
                        <div className="space-y-8">
                            <motion.div
                                className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, margin: "-100px" }}
                                variants={stagger}
                            >
                                {currentHotels().map(hotel => (
                                    <motion.article
                                        key={hotel._id || hotel.id}
                                        className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_4px_20px_rgba(92,64,51,0.1)] transition hover:-translate-y-1.5 hover:shadow-[0_12px_40px_rgba(92,64,51,0.2)]"
                                        variants={fadeInUp}
                                    >
                                        <div className="relative h-48 overflow-hidden">
                                            <img
                                                src={
                                                    hotel.photos && hotel.photos.length > 0
                                                        ? hotel.photos[0]
                                                        : fallbackHotelImage
                                                }
                                                alt={hotel.name}
                                                className="h-full w-full object-cover transition-transform duration-[900ms] hover:scale-105"
                                            />
                                            {hotel.tag && (
                                                <span className="absolute left-4 top-4 rounded-full bg-bronze px-3 py-1 text-[0.7rem] uppercase tracking-[0.12em] text-white">
                                                    {hotel.tag}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-1 flex-col px-5 pb-4 pt-4">
                                            <div className="mb-2 flex items-center justify-between gap-2">
                                                <h3
                                                    className="text-[1.1rem] dark:text-cream"
                                                    style={{ fontFamily: 'Playfair Display, serif' }}
                                                >
                                                    {hotel.name}
                                                </h3>
                                                <div className="flex items-center gap-1 text-[0.85rem]">
                                                    <span
                                                        className="rounded bg-cream px-2 py-0.5 text-bronze dark:bg-gray-700 dark:text-gold"
                                                        style={{ fontFamily: 'Playfair Display, serif' }}
                                                    >
                                                        {hotel.rating.toFixed(1)}
                                                    </span>
                                                    <span className="text-[#FACC15] dark:text-yellow-400">★</span>
                                                </div>
                                            </div>
                                            <p className="mb-1 text-[0.85rem] text-taupe dark:text-gray-300">
                                                {hotel.address}
                                            </p>
                                            <p className="mb-3 line-clamp-3 text-[0.9rem] text-taupe dark:text-gray-300">
                                                {hotel.description}
                                            </p>
                                            <div className="mb-3 flex flex-wrap gap-2">
                                                {hotel.amenities.slice(0, 4).map((a, idx) => (
                                                    <span
                                                        key={`${a}-${idx}`}
                                                        className="rounded-full bg-cream px-3 py-1 text-[0.75rem] text-taupe dark:bg-gray-700 dark:text-gray-300"
                                                    >
                                                        {a}
                                                    </span>
                                                ))}
                                            </div>
                                            <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                                                <Link
                                                    to={`/hotel/${hotel._id || hotel.id}`}
                                                    className="inline-flex flex-1 justify-center rounded border border-wheat bg-cream px-3 py-2 text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-bronze hover:bg-bronze hover:text-white transition dark:bg-gray-700 dark:border-gray-600 dark:text-gold dark:hover:bg-gold dark:hover:text-white"
                                                >
                                                    View Details
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => openModal(hotel)}
                                                    className="inline-flex flex-1 justify-center rounded border-2 border-bronze bg-bronze px-3 py-2 text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-white hover:bg-transparent hover:text-bronze transition dark:bg-gold dark:text-ink dark:border-gold dark:hover:bg-transparent dark:hover:text-gold"
                                                >
                                                    View Rooms
                                                </button>
                                            </div>
                                        </div>
                                    </motion.article>
                                ))}
                            </motion.div>

                            <div className="flex items-center justify-center gap-4">
                                <button
                                    type="button"
                                    onClick={goToPreviousPage}
                                    disabled={currentPage === 1}
                                    className="rounded border border-wheat bg-cream px-4 py-2 text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-bronze disabled:cursor-not-allowed disabled:opacity-60 hover:bg-bronze hover:text-white transition dark:bg-gray-700 dark:border-gray-600 dark:text-gold dark:hover:bg-gold dark:hover:text-white"
                                >
                                    Previous
                                </button>
                                <span className="text-[0.85rem] text-taupe dark:text-gray-300">
                                    Page {currentPage} of {totalPages() || 1}
                                </span>
                                <button
                                    type="button"
                                    onClick={goToNextPage}
                                    disabled={currentPage === totalPages() || totalPages() === 0}
                                    className="rounded border border-wheat bg-cream px-4 py-2 text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-bronze disabled:cursor-not-allowed disabled:opacity-60 hover:bg-bronze hover:text-white transition dark:bg-gray-700 dark:border-gray-600 dark:text-gold dark:hover:bg-gold dark:hover:text-white"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </section>


            {/* COLLECTIONS */}
            <section className="bg-ivory py-14 dark:bg-gray-900 dark:text-cream">
                <div className="mx-auto max-w-[1400px] px-6">
                    <div className="mb-8 max-w-xl">
                        <p className="mb-1 text-[0.85rem] font-semibold uppercase tracking-[0.18em] text-bronze dark:text-gold">
                            Curated Collections
                        </p>
                        <h2
                            className="mb-2 text-2xl md:text-[2rem] dark:text-cream"
                            style={{ fontFamily: 'Playfair Display, serif' }}
                        >
                            Stay For Every Occasion
                        </h2>
                        <p className="text-[0.95rem] text-taupe dark:text-gray-300">
                            Browse thoughtfully curated hotel groups, from romantic getaways to family
                            retreats and business-ready stays.
                        </p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-3">
                        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_4px_20px_rgba(92,64,51,0.1)]">
                            <div className="h-40 bg-[url('https://images.pexels.com/photos/3584930/pexels-photo-3584930.jpeg?auto=compress&cs=tinysrgb&w=1200')] bg-cover bg-center" />
                            <div className="px-5 py-4">
                                <h3
                                    className="mb-1 text-lg dark:text-cream"
                                    style={{ fontFamily: 'Playfair Display, serif' }}
                                >
                                    Romantic Escapes
                                </h3>
                                <p className="mb-3 text-[0.9rem] text-taupe dark:text-gray-300">
                                    Secluded suites, candlelit dining, and stunning views for anniversaries,
                                    honeymoons and special celebrations.
                                </p>
                                <button
                                    onClick={() => document.getElementById('hotel-results')?.scrollIntoView({ behavior: 'smooth' })}
                                    type="button"
                                    className="text-[0.85rem] font-semibold text-bronze hover:underline dark:text-gold dark:hover:text-gold"
                                >
                                    Browse Hotels →
                                </button>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_4px_20px_rgba(92,64,51,0.1)]">
                            <div className="h-40 bg-[url('https://images.pexels.com/photos/3895106/pexels-photo-3895106.jpeg?auto=compress&cs=tinysrgb&w=1200')] bg-cover bg-center" />
                            <div className="px-5 py-4">
                                <h3
                                    className="mb-1 text-lg dark:text-cream"
                                    style={{ fontFamily: 'Playfair Display, serif' }}
                                >
                                    Family-Friendly Stays
                                </h3>
                                <p className="mb-3 text-[0.9rem] text-taupe dark:text-gray-300">
                                    Spacious rooms, kids&apos; amenities, and convenient locations designed
                                    for memorable family holidays.
                                </p>
                                <button
                                    onClick={() => document.getElementById('hotel-results')?.scrollIntoView({ behavior: 'smooth' })}
                                    type="button"
                                    className="text-[0.85rem] font-semibold text-bronze hover:underline dark:text-gold dark:hover:text-gold"
                                >
                                    Browse Hotels →
                                </button>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_4px_20px_rgba(92,64,51,0.1)]">
                            <div className="h-40 bg-[url('https://images.pexels.com/photos/1181400/pexels-photo-1181400.jpeg?auto=compress&cs=tinysrgb&w=1200')] bg-cover bg-center" />
                            <div className="px-5 py-4">
                                <h3
                                    className="mb-1 text-lg dark:text-cream"
                                    style={{ fontFamily: 'Playfair Display, serif' }}
                                >
                                    Business &amp; City Hotels
                                </h3>
                                <p className="mb-3 text-[0.9rem] text-taupe dark:text-gray-300">
                                    Central locations with meeting facilities, workspaces, and seamless
                                    connectivity for professionals on the move.
                                </p>
                                <button
                                    onClick={() => document.getElementById('hotel-results')?.scrollIntoView({ behavior: 'smooth' })}
                                    type="button"
                                    className="text-[0.85rem] font-semibold text-bronze hover:underline dark:text-gold dark:hover:text-gold"
                                >
                                    Browse Hotels →
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* WHY BOOK */}
            <section className="bg-cream py-14 dark:bg-gray-800 dark:text-cream">
                <div className="mx-auto flex max-w-[1400px] flex-col gap-8 px-6 md:flex-row md:items-start">
                    <div className="flex-1">
                        <p className="mb-1 text-[0.85rem] font-semibold uppercase tracking-[0.18em] text-bronze dark:text-gold">
                            Why Book With Us
                        </p>
                        <h2
                            className="mb-2 text-2xl md:text-[2rem] dark:text-cream"
                            style={{ fontFamily: 'Playfair Display, serif' }}
                        >
                            Designed Around Your Journey
                        </h2>
                        <p className="mb-5 max-w-xl text-[0.95rem] text-taupe dark:text-gray-300">
                            From flexible search filters to transparent pricing, the booking experience is
                            crafted to make planning your stay effortless and enjoyable.
                        </p>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="rounded-xl bg-white px-4 py-3 shadow-[0_4px_20px_rgba(92,64,51,0.06)]">
                                <h3
                                    className="mb-1 text-[0.95rem] font-semibold dark:text-cream"
                                    style={{ fontFamily: 'Playfair Display, serif' }}
                                >
                                    Handpicked Properties
                                </h3>
                                <p className="text-[0.88rem] text-taupe dark:text-gray-300">
                                    Only verified hotels that meet strict quality, comfort, and service
                                    standards are showcased.
                                </p>
                            </div>
                            <div className="rounded-xl bg-white px-4 py-3 shadow-[0_4px_20px_rgba(92,64,51,0.06)]">
                                <h3
                                    className="mb-1 text-[0.95rem] font-semibold dark:text-cream"
                                    style={{ fontFamily: 'Playfair Display, serif' }}
                                >
                                    Smart Recommendations
                                </h3>
                                <p className="text-[0.88rem] text-taupe dark:text-gray-300">
                                    Filters, ratings, and curated collections help you quickly find stays that
                                    match your priorities.
                                </p>
                            </div>
                            <div className="rounded-xl bg-white px-4 py-3 shadow-[0_4px_20px_rgba(92,64,51,0.06)]">
                                <h3
                                    className="mb-1 text-[0.95rem] font-semibold dark:text-cream"
                                    style={{ fontFamily: 'Playfair Display, serif' }}
                                >
                                    Transparent Rates
                                </h3>
                                <p className="text-[0.88rem] text-taupe dark:text-gray-300">
                                    Clear nightly pricing, highlighted inclusions, and no hidden surprises at
                                    checkout.
                                </p>
                            </div>
                            <div className="rounded-xl bg-white px-4 py-3 shadow-[0_4px_20px_rgba(92,64,51,0.06)]">
                                <h3
                                    className="mb-1 text-[0.95rem] font-semibold dark:text-cream"
                                    style={{ fontFamily: 'Playfair Display, serif' }}
                                >
                                    Future-Ready
                                </h3>
                                <p className="text-[0.88rem] text-taupe dark:text-gray-300">
                                    Designed to connect with your backend for real-time availability, offers,
                                    and user profiles.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="w-full max-w-sm md:ml-6">
                        <div className="rounded-2xl bg-white p-5 shadow-[0_8px_30px_rgba(92,64,51,0.15)]">
                            <h3
                                className="mb-2 text-[1.2rem]"
                                style={{ fontFamily: 'Playfair Display, serif' }}
                            >
                                Need Help Choosing?
                            </h3>
                            <p className="mb-3 text-[0.9rem] text-taupe">
                                Tell us what kind of stay you're planning and our team will recommend the right
                                hotel and room for you.
                            </p>
                            <button
                                onClick={() => { window.location.href = '/contact'; }}
                                type="button"
                                className="w-full rounded border-2 border-bronze bg-bronze px-5 py-2.5 text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-white hover:bg-transparent hover:text-bronze transition"
                            >
                                Ask Our Team
                            </button>
                        </div>
                    </div>
                </div>
            </section>

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

export default Hotels;
