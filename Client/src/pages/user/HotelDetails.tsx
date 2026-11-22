import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { api } from '../../utils/api';
import { bookUrl } from '../../utils/booking';

type Hotel = {
    _id?: string;
    id?: string;
    name?: string;
    description?: string;
    address?: string;
    rating?: number;
    photos?: string[];
    amenities?: string[];
};

type Room = {
    _id?: string;
    id?: string;
    roomNumber?: string;
    status?: string;
    type?: {
        _id?: string;
        name?: string;
        basePrice?: number;
        maxOccupancy?: number;
        size?: number;
        bedType?: string;
        view?: string;
    } | string;
};


const fallbackHero =
    'https://images.pexels.com/photos/261102/pexels-photo-261102.jpeg?auto=compress&cs=tinysrgb&w=1600';

const HotelDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [hotel, setHotel] = useState<Hotel | null>(null);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);





    useEffect(() => {
        const fetchHotelData = async () => {
            try {
                setLoading(true);

                const hotelRes = await api.get(`/api/hotels/${id}`);
                if (hotelRes.status === 404 || hotelRes.status === 400) throw new Error('Hotel not found');
                if (!hotelRes.ok) throw new Error('Failed to fetch hotel');
                const hotelData = await hotelRes.json();
                const foundHotel: Hotel | undefined = hotelData.data;
                if (!foundHotel) {
                    throw new Error('Hotel not found');
                }
                setHotel(foundHotel);

                const roomsRes = await api.get(`/api/rooms?hotel=${id}`);
                if (!roomsRes.ok) throw new Error('Failed to fetch rooms');
                const roomsData = await roomsRes.json();
                if (roomsData.success) {
                    setRooms(roomsData.data);
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


        fetchHotelData();
    }, [id]);








    // One card per room type (the API returns every physical room)
    const roomTypes = rooms.filter((r, i, all) => {
        const key = typeof r.type === 'string' ? r.type : r.type?._id;
        return all.findIndex(o => (typeof o.type === 'string' ? o.type : o.type?._id) === key) === i;
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-ivory dark:bg-night text-ink dark:text-cream font-body transition-colors duration-300">
                <Navbar />
                <div className="py-32 text-center text-sm text-taupe dark:text-gray-300">Loading...</div>
                <Footer />
            </div>
        );
    }

    if (error || !hotel) {
        return (
            <div className="min-h-screen bg-ivory dark:bg-night text-ink dark:text-cream font-body transition-colors duration-300">
                <Navbar />
                <div className="py-32 text-center text-sm text-red-700 dark:text-red-400">
                    {error || 'Hotel not found'}
                </div>
                <Footer />
            </div>
        );
    }

    const heroImg =
        hotel.photos && hotel.photos.length > 0 ? hotel.photos[0] : fallbackHero;

    return (
        <div className="min-h-screen bg-ivory dark:bg-night text-ink dark:text-cream font-body transition-colors duration-300">
            <Navbar />

            {/* HERO */}
            <header className="relative flex h-[480px] items-end overflow-hidden bg-ink">
                <div
                    className="absolute inset-0 bg-cover bg-center scale-110 animate-[roomsHeroZoom_18s_ease-in-out_infinite_alternate]"
                    style={{ backgroundImage: `url(${heroImg})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[rgba(44,36,22,0.9)] via-[rgba(44,36,22,0.6)] to-transparent" />
                <div className="relative z-10 mx-auto flex w-full max-w-[1400px] items-end px-6 pb-8">
                    <div>
                        <span className="mb-2 inline-block text-[0.8rem] font-semibold uppercase tracking-[0.18em] text-sand">
                            Hotel Overview
                        </span>
                        <h1
                            className="text-3xl md:text-4xl text-white"
                            style={{ fontFamily: 'Playfair Display, serif' }}
                        >
                            {hotel.name}
                        </h1>
                        {hotel.address && (
                            <p className="mt-2 text-[0.9rem] text-cream">{hotel.address}</p>
                        )}
                    </div>
                    {typeof hotel.rating === 'number' && (
                        <div className="ml-auto flex items-center gap-2 rounded-full bg-black/35 px-4 py-2 text-sm text-white">
                            <span
                                className="rounded bg-cream px-2 py-0.5 text-bronze"
                                style={{ fontFamily: 'Playfair Display, serif' }}
                            >
                                {hotel.rating.toFixed(1)}
                            </span>
                            <span className="text-[#FACC15]">★</span>
                            <span className="text-sand">Guest Rating</span>
                        </div>
                    )}
                </div>
            </header>

            {/* MAIN */}
            <main className="mx-auto flex max-w-[1400px] flex-col gap-8 px-6 py-10 md:flex-row md:items-start">
                {/* LEFT: DETAILS */}
                <div className="flex-1 space-y-8">
                    <section>
                        <h2
                            className="mb-2 text-xl md:text-2xl"
                            style={{ fontFamily: 'Playfair Display, serif' }}
                        >
                            About This Hotel
                        </h2>
                        <p className="text-[0.95rem] leading-7 text-taupe dark:text-gray-300">
                            {hotel.description}
                        </p>
                    </section>

                    <section>
                        <h2
                            className="mb-2 text-xl md:text-2xl"
                            style={{ fontFamily: 'Playfair Display, serif' }}
                        >
                            Amenities &amp; Services
                        </h2>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {hotel.amenities &&
                                hotel.amenities.map((amenity, idx) => (
                                    <div
                                        key={`${amenity}-${idx}`}
                                        className="flex items-start gap-2 rounded-lg bg-cream px-3 py-2 text-[0.9rem] text-ink"
                                    >
                                        <span className="mt-0.5 text-bronze">✓</span>
                                        <span>{amenity}</span>
                                    </div>
                                ))}
                        </div>
                    </section>

                    <section>
                        <h2
                            className="mb-2 text-xl md:text-2xl"
                            style={{ fontFamily: 'Playfair Display, serif' }}
                        >
                            Gallery
                        </h2>
                        <div className="grid gap-3 sm:grid-cols-3">
                            {hotel.photos && hotel.photos.map((photo, idx) => (
                                <div
                                    key={`${photo}-${idx}`}
                                    className="overflow-hidden rounded-xl bg-cream"
                                >
                                    <img
                                        src={photo}
                                        alt={`Hotel view ${idx}`}
                                        className="h-32 w-full object-cover transition-transform duration-500 hover:scale-105"
                                    />
                                </div>
                            ))}
                        </div>
                    </section>

                    <Link
                        to="/hotels"
                        className="inline-flex items-center justify-center rounded border border-wheat bg-cream px-5 py-2 text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-bronze hover:bg-bronze hover:text-white transition"
                    >
                        ← Back to Hotels
                    </Link>
                </div>

                {/* RIGHT: ROOMS LIST */}
                <aside className="w-full max-w-md md:ml-6">
                    <div className="mb-4">
                        <h2
                            className="mb-1 text-xl md:text-2xl"
                            style={{ fontFamily: 'Playfair Display, serif' }}
                        >
                            Guest Rooms
                        </h2>
                        <p className="text-[0.9rem] text-taupe dark:text-gray-300">
                            Browse the types of rooms available at this property.
                        </p>
                    </div>

                    {roomTypes.length === 0 ? (
                        <div className="rounded-2xl bg-white px-4 py-6 text-center text-[0.9rem] text-taupe dark:text-gray-300 shadow-[0_4px_20px_rgba(92,64,51,0.1)]">
                            No rooms listed.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {roomTypes.map(room => {
                                const typeObj =
                                    typeof room.type === 'string' ? undefined : room.type;
                                return (
                                    <div
                                        key={room._id || room.id}
                                        className="flex flex-col gap-3 rounded-2xl bg-white dark:bg-gray-800 p-4 shadow-[0_4px_20px_rgba(92,64,51,0.1)]"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <h3
                                                    className="text-[1rem] font-semibold dark:text-cream"
                                                    style={{ fontFamily: 'Playfair Display, serif' }}
                                                >
                                                    {typeObj?.name || 'Room'}
                                                </h3>
                                                <p className="text-[0.85rem] text-taupe dark:text-gray-300">
                                                    {[typeObj?.bedType, typeObj?.maxOccupancy ? `Up to ${typeObj.maxOccupancy} guests` : null].filter(Boolean).join(' · ')}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p
                                                    className="text-[1.1rem] dark:text-cream text-bronze"
                                                    style={{ fontFamily: 'Playfair Display, serif' }}
                                                >
                                                    {typeObj?.basePrice
                                                        ? `$${typeObj.basePrice}`
                                                        : 'N/A'}
                                                </p>
                                                <p className="text-[0.75rem] text-taupe dark:text-gray-400">per night</p>
                                            </div>
                                        </div>
                                        <div className="w-full h-px bg-sand dark:bg-gray-700 my-1"></div>
                                        <button
                                            type="button"
                                            onClick={() => navigate(bookUrl({ type: typeObj?._id, hotel: id }))}
                                            className="w-full rounded border-2 border-bronze bg-bronze px-4 py-2 text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-white hover:bg-transparent hover:text-bronze transition"
                                        >
                                            Check availability
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </aside>
            </main>


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

export default HotelDetails;
