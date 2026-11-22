import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { api } from '../../utils/api';
import { bookUrl } from '../../utils/booking';

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



const fallbackHero =
    'https://images.pexels.com/photos/271639/pexels-photo-271639.jpeg?auto=compress&cs=tinysrgb&w=1600';

const RoomDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [room, setRoom] = useState<RoomType | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);




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








    const openBookingModal = () =>
        navigate(bookUrl({
            type: room?._id || room?.id,
            hotel: room?.hotel,
            checkIn: searchParams.get('checkIn'),
            checkOut: searchParams.get('checkOut'),
            guests: searchParams.get('guests'),
        }));

    if (loading) {
        return (
            <div className="min-h-screen bg-ivory dark:bg-night text-ink dark:text-cream font-body transition-colors duration-300">
                <Navbar />
                <div className="py-32 text-center text-sm text-taupe dark:text-gray-300">Loading...</div>
                <Footer />
            </div>
        );
    }
    if (error) {
        return (
            <div className="min-h-screen bg-ivory dark:bg-night text-ink dark:text-cream font-body transition-colors duration-300">
                <Navbar />
                <div className="py-32 text-center text-sm text-red-700 dark:text-red-400">{error}</div>
                <Footer />
            </div>
        );
    }
    if (!room) {
        return (
            <div className="min-h-screen bg-ivory dark:bg-night text-ink dark:text-cream font-body transition-colors duration-300">
                <Navbar />
                <div className="py-32 text-center text-sm text-red-700 dark:text-red-400">Room not found</div>
                <Footer />
            </div>
        );
    }

    const heroImg =
        room.photos && room.photos.length > 0 ? room.photos[0] : fallbackHero;

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
                <div className="relative z-10 mx-auto flex w-full max-w-[1400px] items-end px-6 pb-10">
                    <div>
                        <span className="mb-2 inline-block text-[0.8rem] font-semibold uppercase tracking-[0.18em] text-sand">
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
                        <p className="text-[0.95rem] leading-7 text-taupe dark:text-gray-300">
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
                                        className="flex items-start gap-2 rounded-lg bg-cream dark:bg-gray-700 px-3 py-2 text-[0.9rem] text-ink dark:text-cream"
                                    >
                                        <span className="mt-0.5 text-bronze">✓</span>
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
                                        className="overflow-hidden rounded-xl bg-cream dark:bg-gray-700"
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
                        className="mt-5 inline-flex items-center justify-center rounded border border-wheat bg-cream dark:bg-gray-700 px-5 py-2 text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-bronze hover:bg-bronze hover:text-white transition"
                    >
                        ← Back to Rooms
                    </Link>
                </div>

                {/* RIGHT SIDEBAR */}
                <aside className="w-full max-w-sm md:ml-6">
                    <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-[0_8px_30px_rgba(92,64,51,0.15)]">
                        <div className="mb-4 flex items-end gap-1">
                            <span
                                className="text-2xl text-bronze"
                                style={{ fontFamily: 'Playfair Display, serif' }}
                            >
                                ${room.basePrice}
                            </span>
                            <span className="text-[0.85rem] text-taupe dark:text-gray-300">/ Night</span>
                        </div>
                        <ul className="mb-4 space-y-2 text-[0.9rem] text-ink dark:text-cream">
                            <li className="flex justify-between">
                                <span className="text-taupe dark:text-gray-300">Occupancy</span>
                                <span>Up to {room.maxOccupancy} Guests</span>
                            </li>
                            {room.size ? (
                                <li className="flex justify-between">
                                    <span className="text-taupe dark:text-gray-300">Size</span>
                                    <span>{room.size} m²</span>
                                </li>
                            ) : null}
                            {room.view && (
                                <li className="flex justify-between">
                                    <span className="text-taupe dark:text-gray-300">View</span>
                                    <span>{room.view}</span>
                                </li>
                            )}
                            {room.bedType && (
                                <li className="flex justify-between">
                                    <span className="text-taupe dark:text-gray-300">Bed</span>
                                    <span>{room.bedType}</span>
                                </li>
                            )}
                        </ul>
                        <button
                            type="button"
                            onClick={openBookingModal}
                            className="w-full rounded border-2 border-bronze bg-bronze px-4 py-2.5 text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-white hover:bg-transparent hover:text-bronze transition"
                        >
                            Book Now
                        </button>
                    </div>
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

export default RoomDetails;
