import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { BsArrowsFullscreen, BsCheck2, BsDoorOpen, BsEye, BsPeople, BsGrid } from 'react-icons/bs';
import { LuBedDouble } from 'react-icons/lu';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import GuestStepper from '../../components/site/GuestStepper';
import Lightbox from '../../components/site/Lightbox';
import RoomTypeCard, { ROOM_FALLBACK } from '../../components/site/RoomTypeCard';
import { Button, EmptyState, Skeleton } from '../../components/ui';
import { api } from '../../utils/api';
import { addDays, bookUrl, formatMoney, nightsBetween, todayInput, type AvailabilityRow, type RoomTypeSummary } from '../../utils/booking';
import { hotelIdOf, hotelNameOf, usePricing, useRoomTypes } from '../../hooks/usePublicData';
import { SITE, telHref } from '../../config/site';

const LABEL = 'mb-1.5 block text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-taupe dark:text-gray-400';
const CONTROL = 'w-full rounded-lg border border-stone bg-white px-3 py-2.5 text-sm text-ink focus:border-bronze focus:outline-none focus:ring-2 focus:ring-gold/50 dark:border-graphite dark:bg-night dark:text-cream cursor-pointer';

/** Live price and availability for this room type, with a Reserve button into /book. */
const BookingCard: React.FC<{ type: RoomTypeSummary; currency: string }> = ({ type, currency }) => {
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const today = todayInput();
    const checkIn = params.get('checkIn') && params.get('checkIn')! >= today ? params.get('checkIn')! : today;
    const checkOut = params.get('checkOut') && params.get('checkOut')! > checkIn ? params.get('checkOut')! : addDays(checkIn, 1);
    const guests = Math.min(type.maxOccupancy || 10, Math.max(1, Number(params.get('guests')) || Math.min(2, type.maxOccupancy || 2)));
    const set = (patch: Record<string, string>) => {
        const next = new URLSearchParams(params);
        Object.entries(patch).forEach(([k, v]) => next.set(k, v));
        setParams(next, { replace: true });
    };

    const [row, setRow] = useState<AvailabilityRow | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => {
        let alive = true;
        setLoading(true);
        setError('');
        const qs = new URLSearchParams({ checkIn, checkOut, guests: String(guests), roomType: type._id });
        api.get(`/api/availability?${qs}`)
            .then(async r => {
                const body = await r.json();
                if (!r.ok) throw new Error(body.message || 'Could not check availability');
                return (body.data.results as AvailabilityRow[]).find(x => x.roomType._id === type._id) || null;
            })
            .then(x => { if (alive) setRow(x); })
            .catch(err => { if (alive) setError(err instanceof Error ? err.message : 'Could not check availability'); })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [checkIn, checkOut, guests, type._id]);

    const nights = nightsBetween(checkIn, checkOut);
    const q = row?.quote;
    const bookable = !!row && row.available > 0 && row.fitsGuests && !!q;
    const cur = q?.currency || currency;

    return (
        <div className="rounded-2xl border border-stone bg-white p-6 shadow-[0_24px_50px_-28px_rgba(44,36,22,0.45)] dark:border-graphite dark:bg-charcoal">
            <p className="text-[0.68rem] uppercase tracking-[0.16em] text-taupe dark:text-gray-400">From</p>
            <p className="font-display text-3xl text-ink dark:text-cream">
                {formatMoney(type.basePrice, cur)}<span className="font-body text-sm text-taupe dark:text-gray-400"> / night</span>
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
                <div>
                    <label htmlFor="rd-in" className={LABEL}>Check in</label>
                    <input id="rd-in" type="date" min={today} value={checkIn} className={CONTROL}
                        onChange={e => e.target.value && set({ checkIn: e.target.value, checkOut: checkOut > e.target.value ? checkOut : addDays(e.target.value, 1) })} />
                </div>
                <div>
                    <label htmlFor="rd-out" className={LABEL}>Check out</label>
                    <input id="rd-out" type="date" min={addDays(checkIn, 1)} value={checkOut} className={CONTROL}
                        onChange={e => e.target.value && set({ checkOut: e.target.value })} />
                </div>
            </div>
            <div className="mt-3">
                <span className={LABEL}>Guests</span>
                <div className="rounded-lg border border-stone px-2 py-[0.3rem] dark:border-graphite">
                    <GuestStepper value={guests} max={type.maxOccupancy || 10} onChange={n => set({ guests: String(n) })} />
                </div>
            </div>

            <div className="mt-6 min-h-[120px] border-t border-stone pt-5 text-sm dark:border-graphite" aria-live="polite" aria-busy={loading}>
                {loading ? (
                    <div className="space-y-3"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /><Skeleton className="h-6 w-1/2" /></div>
                ) : error ? (
                    <p className="text-danger">{error}</p>
                ) : !row ? (
                    <p className="text-taupe dark:text-gray-400">This room is not available to book online right now.</p>
                ) : !row.fitsGuests ? (
                    <p className="text-taupe dark:text-gray-400">This room sleeps up to {type.maxOccupancy}. Choose fewer guests or <Link to="/rooms" className="text-bronze underline dark:text-gold">a larger room</Link>.</p>
                ) : row.restriction ? (
                    <p className="text-taupe dark:text-gray-400">{row.restriction}. Try other dates or call us on <a href={telHref(SITE.phone)} className="text-bronze underline dark:text-gold">{SITE.phone}</a>.</p>
                ) : row.available === 0 ? (
                    <p className="text-taupe dark:text-gray-400">Sold out for these dates. Try other dates or call us on <a href={telHref(SITE.phone)} className="text-bronze underline dark:text-gold">{SITE.phone}</a>.</p>
                ) : q && (
                    <dl className="space-y-2">
                        <div className="flex justify-between text-taupe dark:text-gray-300">
                            <dt>{formatMoney(q.nightlyRate, cur)} × {nights} night{nights === 1 ? '' : 's'}</dt><dd>{formatMoney(q.subtotal, cur)}</dd>
                        </div>
                        {q.serviceCharge > 0 && (
                            <div className="flex justify-between text-taupe dark:text-gray-300"><dt>Service charge ({q.serviceChargePercent}%)</dt><dd>{formatMoney(q.serviceCharge, cur)}</dd></div>
                        )}
                        {q.tax > 0 && (
                            <div className="flex justify-between text-taupe dark:text-gray-300"><dt>Taxes ({q.taxPercent}%)</dt><dd>{formatMoney(q.tax, cur)}</dd></div>
                        )}
                        <div className="flex justify-between border-t border-stone pt-3 text-base font-semibold text-ink dark:border-graphite dark:text-cream">
                            <dt>Total</dt><dd>{formatMoney(q.total, cur)}</dd>
                        </div>
                        {row.available <= 2 && <p className="pt-1 text-xs font-semibold text-bronze dark:text-gold">Only {row.available} left for these dates</p>}
                    </dl>
                )}
            </div>

            <Button
                fullWidth
                size="lg"
                className="mt-5"
                disabled={!bookable}
                onClick={() => navigate(bookUrl({ type: type._id, hotel: hotelIdOf(type), checkIn, checkOut, guests }))}
            >
                Reserve
            </Button>
            <p className="mt-3 text-center text-xs text-taupe dark:text-gray-400">You won't be charged until the next step. Free cancellation before check-in.</p>
        </div>
    );
};

const RoomDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const all = useRoomTypes();
    const { currency } = usePricing();
    const [room, setRoom] = useState<RoomTypeSummary | null>(null);
    const [state, setState] = useState<'loading' | 'ok' | 'missing' | 'error'>('loading');
    const [photo, setPhoto] = useState<number | null>(null);

    useEffect(() => {
        let alive = true;
        setState('loading');
        api.get(`/api/room-types/${id}`)
            .then(async r => {
                if (r.status === 404 || r.status === 400) return null;
                if (!r.ok) throw new Error('load');
                return (await r.json()).data as RoomTypeSummary;
            })
            .then(t => { if (!alive) return; setRoom(t); setState(t ? 'ok' : 'missing'); if (t) document.title = `${t.name} | ${SITE.name}`; })
            .catch(() => alive && setState('error'));
        return () => { alive = false; };
    }, [id]);

    const photos = useMemo(() => {
        const list = room?.photos?.length ? room.photos : [ROOM_FALLBACK];
        return list.map((src, i) => ({ src, alt: `${room?.name || 'Room'}, photo ${i + 1}` }));
    }, [room]);

    const others = useMemo(() => {
        if (!room) return [];
        const sameHotel = all.data.filter(t => t._id !== room._id && hotelIdOf(t) === hotelIdOf(room));
        return (sameHotel.length ? sameHotel : all.data.filter(t => t._id !== room._id)).slice(0, 3);
    }, [all.data, room]);

    if (state !== 'ok' || !room) {
        return (
            <div className="min-h-screen bg-ivory font-body text-ink dark:bg-night dark:text-cream">
                <Navbar />
                <div className="h-24 bg-ink" />
                <main id="main" className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6">
                    {state === 'loading' ? (
                        <div className="space-y-6"><Skeleton className="h-[420px] rounded-2xl" /><Skeleton className="h-8 w-1/3" /><Skeleton className="h-4 w-2/3" /></div>
                    ) : (
                        <EmptyState
                            title={state === 'missing' ? 'We couldn’t find that room' : 'Something went wrong'}
                            description={state === 'missing' ? 'It may have been renamed or removed.' : 'Please refresh the page and try again.'}
                            action={<Link to="/rooms" className="text-sm font-semibold uppercase tracking-[0.16em] text-bronze dark:text-gold">See all rooms →</Link>}
                        />
                    )}
                </main>
                <Footer />
            </div>
        );
    }

    const facts = [
        room.size ? { icon: <BsArrowsFullscreen />, label: 'Size', value: `${room.size} m²` } : null,
        room.bedType ? { icon: <LuBedDouble />, label: 'Bed', value: room.bedType } : null,
        room.view ? { icon: <BsEye />, label: 'View', value: room.view } : null,
        { icon: <BsPeople />, label: 'Guests', value: `Up to ${room.maxOccupancy}` },
    ].filter(Boolean) as { icon: React.ReactNode; label: string; value: string }[];
    const hotelName = hotelNameOf(room);

    return (
        <div className="min-h-screen bg-ivory font-body text-ink dark:bg-night dark:text-cream">
            <Navbar />
            <div className="h-20 bg-ink md:h-24" />

            <main id="main" className="mx-auto max-w-[1400px] px-4 pb-24 pt-8 sm:px-6">
                <nav aria-label="Breadcrumb" className="mb-6 text-xs uppercase tracking-[0.16em] text-taupe dark:text-gray-400">
                    <Link to="/rooms" className="hover:text-bronze dark:hover:text-gold">Rooms</Link>
                    <span className="mx-2" aria-hidden="true">/</span>
                    <span aria-current="page" className="text-ink dark:text-cream">{room.name}</span>
                </nav>

                {/* Gallery */}
                <div className="relative grid gap-3 overflow-hidden rounded-2xl md:grid-cols-4 md:grid-rows-2" style={{ maxHeight: 560 }}>
                    {photos.slice(0, 5).map((p, i) => (
                        <button key={p.src + i} type="button" onClick={() => setPhoto(i)} aria-label={`Open ${p.alt}`}
                            className={`group relative overflow-hidden bg-stone dark:bg-graphite cursor-zoom-in ${i === 0 ? 'aspect-[4/3] md:col-span-2 md:row-span-2 md:aspect-auto md:min-h-[460px]' : 'hidden aspect-[4/3] md:block'} ${photos.length === 1 ? 'md:col-span-4' : ''}`}>
                            <img src={p.src} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                                onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = ROOM_FALLBACK; }} />
                        </button>
                    ))}
                    {photos.length > 1 && (
                        <button type="button" onClick={() => setPhoto(0)}
                            className="absolute bottom-4 right-4 flex items-center gap-2 rounded-lg bg-white/95 px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-ink shadow cursor-pointer">
                            <BsGrid /> All photos ({photos.length})
                        </button>
                    )}
                </div>

                <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_380px]">
                    <div>
                        {hotelName && <p className="mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-bronze dark:text-gold">{hotelName}</p>}
                        <h1 className="font-display text-4xl leading-tight text-ink sm:text-5xl dark:text-cream">{room.name}</h1>

                        <ul className="mt-8 grid grid-cols-2 gap-4 border-y border-wheat py-6 sm:grid-cols-4 dark:border-graphite">
                            {facts.map(f => (
                                <li key={f.label} className="flex items-start gap-3">
                                    <span className="mt-0.5 text-lg text-bronze dark:text-gold" aria-hidden="true">{f.icon}</span>
                                    <span>
                                        <span className="block text-[0.68rem] uppercase tracking-[0.16em] text-taupe dark:text-gray-400">{f.label}</span>
                                        <span className="text-sm font-semibold text-ink dark:text-cream">{f.value}</span>
                                    </span>
                                </li>
                            ))}
                        </ul>

                        {room.description && (
                            <section className="mt-10" aria-labelledby="about-room">
                                <h2 id="about-room" className="font-display text-2xl text-ink dark:text-cream">About this room</h2>
                                <p className="mt-4 max-w-3xl whitespace-pre-line text-[1.02rem] leading-8 text-taupe dark:text-gray-300">{room.description}</p>
                            </section>
                        )}

                        {!!room.amenities?.length && (
                            <section className="mt-10" aria-labelledby="amenities">
                                <h2 id="amenities" className="font-display text-2xl text-ink dark:text-cream">In your room</h2>
                                <ul className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                                    {room.amenities.map(a => (
                                        <li key={a} className="flex items-center gap-3 text-[0.95rem] text-ink dark:text-cream">
                                            <BsCheck2 className="shrink-0 text-lg text-bronze dark:text-gold" aria-hidden="true" />{a}
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        <section className="mt-10 rounded-2xl bg-cream p-6 dark:bg-charcoal" aria-labelledby="policies">
                            <h2 id="policies" className="flex items-center gap-3 font-display text-2xl text-ink dark:text-cream">
                                <BsDoorOpen className="text-bronze dark:text-gold" aria-hidden="true" /> Good to know
                            </h2>
                            <dl className="mt-5 grid gap-5 text-sm sm:grid-cols-3">
                                <div><dt className="font-semibold text-ink dark:text-cream">Check-in</dt><dd className="mt-1 text-taupe dark:text-gray-400">From {SITE.checkInTime}</dd></div>
                                <div><dt className="font-semibold text-ink dark:text-cream">Check-out</dt><dd className="mt-1 text-taupe dark:text-gray-400">By {SITE.checkOutTime}</dd></div>
                                <div><dt className="font-semibold text-ink dark:text-cream">Cancellation</dt><dd className="mt-1 text-taupe dark:text-gray-400">Cancel online before check-in for a full refund.</dd></div>
                            </dl>
                            <Link to="/policies#cancellation" className="mt-5 inline-block text-xs font-semibold uppercase tracking-[0.16em] text-bronze hover:underline dark:text-gold">Read the full policies</Link>
                        </section>
                    </div>

                    <aside aria-label="Book this room" className="lg:sticky lg:top-28 lg:self-start">
                        <BookingCard key={room._id} type={room} currency={currency} />
                    </aside>
                </div>

                {others.length > 0 && (
                    <section className="mt-24" aria-labelledby="others">
                        <h2 id="others" className="mb-8 font-display text-3xl text-ink dark:text-cream">Other rooms you may like</h2>
                        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {others.map(t => <RoomTypeCard key={t._id} type={t} currency={currency} />)}
                        </div>
                    </section>
                )}
            </main>

            <Lightbox images={photos} index={photo} onChange={setPhoto} />
            <Footer />
        </div>
    );
};

export default RoomDetails;
