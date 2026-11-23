import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import PageHero from '../../components/PageHero';
import BookingBar from '../../components/site/BookingBar';
import RoomTypeCard from '../../components/site/RoomTypeCard';
import Reveal from '../../components/site/Reveal';
import { Button, EmptyState, Skeleton } from '../../components/ui';
import { api } from '../../utils/api';
import { formatDate, todayInput, type AvailabilityRow } from '../../utils/booking';
import { hotelIdOf, useHotels, usePricing, useRoomTypes } from '../../hooks/usePublicData';
import { IMAGES } from '../../config/content';
import { SITE, telHref } from '../../config/site';

type Sort = 'price-asc' | 'price-desc' | 'size' | 'guests';

const chip = (active: boolean) =>
    `rounded-full border px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.14em] transition-colors cursor-pointer ${active
        ? 'border-bronze bg-bronze text-white dark:border-gold dark:bg-gold dark:text-night'
        : 'border-wheat text-umber hover:border-bronze hover:text-bronze dark:border-graphite dark:text-cream dark:hover:border-gold dark:hover:text-gold'}`;

const Rooms: React.FC = () => {
    const [params, setParams] = useSearchParams();
    const rooms = useRoomTypes();
    const hotels = useHotels();
    const { currency } = usePricing();

    const checkIn = params.get('in') && params.get('in')! >= todayInput() ? params.get('in')! : '';
    const checkOut = checkIn && params.get('out') && params.get('out')! > checkIn ? params.get('out')! : '';
    const guests = Math.min(10, Math.max(1, Number(params.get('guests')) || 2));
    const hotel = params.get('hotel') || '';
    const sort = (params.get('sort') as Sort) || 'price-asc';
    const hasDates = !!(checkIn && checkOut);

    const set = (patch: Record<string, string | null>) => {
        const next = new URLSearchParams(params);
        Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
        setParams(next, { replace: true });
    };

    // Live availability for the chosen dates
    const [avail, setAvail] = useState<{ rows: Map<string, AvailabilityRow>; loading: boolean; error: string }>({ rows: new Map(), loading: false, error: '' });
    useEffect(() => {
        if (!hasDates) { setAvail({ rows: new Map(), loading: false, error: '' }); return; }
        let alive = true;
        setAvail(a => ({ ...a, loading: true, error: '' }));
        const qs = new URLSearchParams({ checkIn, checkOut, guests: String(guests) });
        api.get(`/api/availability?${qs}`)
            .then(async r => {
                const body = await r.json();
                if (!r.ok) throw new Error(body.message || 'Could not check availability');
                return body.data.results as AvailabilityRow[];
            })
            .then(list => alive && setAvail({ rows: new Map(list.map(x => [x.roomType._id, x])), loading: false, error: '' }))
            .catch(err => alive && setAvail({ rows: new Map(), loading: false, error: err instanceof Error ? err.message : 'Could not check availability' }));
        return () => { alive = false; };
    }, [hasDates, checkIn, checkOut, guests]);

    const list = useMemo(() => {
        const filtered = rooms.data.filter(t => !hotel || hotelIdOf(t) === hotel);
        const bookable = (id: string) => {
            const r = avail.rows.get(id);
            return !hasDates || (r && r.available > 0 && r.fitsGuests) ? 0 : 1;
        };
        const by: Record<Sort, (a: typeof filtered[number], b: typeof filtered[number]) => number> = {
            'price-asc': (a, b) => a.basePrice - b.basePrice,
            'price-desc': (a, b) => b.basePrice - a.basePrice,
            size: (a, b) => (b.size || 0) - (a.size || 0),
            guests: (a, b) => b.maxOccupancy - a.maxOccupancy,
        };
        return [...filtered].sort((a, b) => bookable(a._id) - bookable(b._id) || by[sort](a, b));
    }, [rooms.data, hotel, sort, avail.rows, hasDates]);

    const statusFor = (id: string) => {
        if (!hasDates || avail.loading) return undefined;
        const r = avail.rows.get(id);
        if (!r) return undefined;
        if (!r.fitsGuests) return { label: `Sleeps ${r.roomType.maxOccupancy}`, tone: 'none' as const, reason: 'too-small' as const };
        if (r.available === 0) return { label: 'Sold out for your dates', tone: 'none' as const, reason: 'sold-out' as const };
        if (r.available <= 2) return { label: `Only ${r.available} left`, tone: 'low' as const };
        return { label: 'Available', tone: 'ok' as const };
    };

    const availableCount = hasDates ? list.filter(t => statusFor(t._id)?.tone !== 'none').length : list.length;

    return (
        <div className="min-h-screen bg-ivory font-body text-ink dark:bg-night dark:text-cream">
            <Navbar />
            <PageHero
                eyebrow="Rooms & Suites"
                title="Find your room"
                subtitle="Choose your dates to see live availability and the full price for your stay, including any service charge and taxes."
                image={IMAGES.bedroom}
            />

            <main id="main" className="mx-auto max-w-[1400px] px-4 pb-24 sm:px-6">
                <div className="relative z-10 -mt-8">
                    <BookingBar
                        key={`${checkIn}|${checkOut}|${guests}|${hotel}`}
                        initial={{ checkIn: checkIn || undefined, checkOut: checkOut || undefined, guests, hotel }}
                        hotels={hotels.data}
                        submitLabel="Show prices"
                        onSearch={s => set({ in: s.checkIn, out: s.checkOut, guests: String(s.guests), hotel: s.hotel || null })}
                    />
                </div>

                <div className="mt-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by hotel">
                        {hotels.data.length > 1 && (
                            <>
                                <button type="button" className={chip(!hotel)} aria-pressed={!hotel} onClick={() => set({ hotel: null })}>All hotels</button>
                                {hotels.data.map(h => (
                                    <button key={h._id} type="button" className={chip(hotel === h._id)} aria-pressed={hotel === h._id} onClick={() => set({ hotel: h._id })}>{h.name}</button>
                                ))}
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                        <p className="text-taupe dark:text-gray-400" aria-live="polite">
                            {rooms.loading ? 'Loading rooms…' : hasDates
                                ? `${availableCount} of ${list.length} available · ${formatDate(checkIn, { day: 'numeric', month: 'short' })} – ${formatDate(checkOut, { day: 'numeric', month: 'short' })}`
                                : `${list.length} room type${list.length === 1 ? '' : 's'}`}
                        </p>
                        <label htmlFor="sort" className="sr-only">Sort rooms</label>
                        <select id="sort" value={sort} onChange={e => set({ sort: e.target.value === 'price-asc' ? null : e.target.value })}
                            className="rounded-lg border border-stone bg-white px-3 py-2 text-sm dark:border-graphite dark:bg-charcoal cursor-pointer">
                            <option value="price-asc">Price: low to high</option>
                            <option value="price-desc">Price: high to low</option>
                            <option value="size">Largest first</option>
                            <option value="guests">Most guests</option>
                        </select>
                        {hasDates && <Button variant="ghost" size="sm" onClick={() => set({ in: null, out: null })}>Clear dates</Button>}
                    </div>
                </div>

                {avail.error && (
                    <p role="alert" className="mt-6 rounded-lg border border-danger/30 bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200">
                        {avail.error}
                    </p>
                )}

                <section aria-label="Rooms" aria-busy={rooms.loading || avail.loading} className="mt-8">
                    {rooms.loading ? (
                        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {[0, 1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-[440px] rounded-2xl" />)}
                        </div>
                    ) : rooms.error ? (
                        <EmptyState title="We couldn't load our rooms" description={`Please refresh the page, or call us on ${SITE.phone}.`} />
                    ) : list.length === 0 ? (
                        <EmptyState title="No rooms here yet" description="Try another hotel." action={<Button onClick={() => set({ hotel: null })}>Show all hotels</Button>} />
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {list.map((t, i) => {
                                const row = avail.rows.get(t._id);
                                return (
                                    <Reveal key={t._id} delay={(i % 3) * 0.06}>
                                        <RoomTypeCard
                                            type={t}
                                            currency={row?.quote?.currency || currency}
                                            stay={hasDates ? { checkIn, checkOut, guests } : undefined}
                                            status={statusFor(t._id)}
                                            total={row?.quote && row.available > 0 && row.fitsGuests ? row.quote.total : undefined}
                                            showHotel={hotels.data.length > 1}
                                        />
                                    </Reveal>
                                );
                            })}
                        </div>
                    )}
                    {hasDates && !avail.loading && list.length > 0 && availableCount === 0 && (
                        <p role="status" className="mt-8 text-center text-sm text-taupe dark:text-gray-400">
                            We are full for these dates. Try nearby dates, or call <a className="font-semibold text-bronze underline dark:text-gold" href={telHref(SITE.phone)}>{SITE.phone}</a> and we will do our best.
                        </p>
                    )}
                </section>
            </main>
            <Footer />
        </div>
    );
};

export default Rooms;
