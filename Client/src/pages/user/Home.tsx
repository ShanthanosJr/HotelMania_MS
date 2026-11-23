import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import BookingBar from '../../components/site/BookingBar';
import Reveal from '../../components/site/Reveal';
import SectionHeading from '../../components/site/SectionHeading';
import RoomTypeCard from '../../components/site/RoomTypeCard';
import Lightbox from '../../components/site/Lightbox';
import { Skeleton } from '../../components/ui';
import { SITE, directionsUrl, mapEmbedUrl } from '../../config/site';
import { DAY_TIMELINE, FACTS, GALLERY, IMAGES, OFFERS, PILLARS } from '../../config/content';
import { useHotels, usePricing, useReviews, useRoomTypes } from '../../hooks/usePublicData';

const ARROW = <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1">→</span>;
const textLink = 'group inline-flex items-center gap-2 text-[0.75rem] font-semibold uppercase tracking-[0.2em] text-bronze hover:text-bronze-deep dark:text-gold dark:hover:text-gold/80';

const Stars: React.FC<{ value: number }> = ({ value }) => (
    <span className="flex gap-0.5 text-gold" aria-label={`${value} out of 5 stars`}>
        {Array.from({ length: 5 }).map((_, i) => <span key={i} aria-hidden="true" className={i < value ? '' : 'opacity-25'}>★</span>)}
    </span>
);

const Home: React.FC = () => {
    const rooms = useRoomTypes();
    const hotels = useHotels();
    const reviews = useReviews();
    const { currency } = usePricing();
    const [photo, setPhoto] = useState<number | null>(null);

    // Cheapest first gives a fair "from" picture; show up to three
    const featured = useMemo(() => [...rooms.data].sort((a, b) => a.basePrice - b.basePrice).slice(0, 3), [rooms.data]);
    const avgRating = useMemo(() => {
        const rated = hotels.data.filter(h => typeof h.rating === 'number' && h.rating > 0);
        return rated.length ? (rated.reduce((s, h) => s + (h.rating || 0), 0) / rated.length).toFixed(1) : null;
    }, [hotels.data]);
    const facts = FACTS
        .map(f => (f.label === 'Average guest rating' ? { ...f, value: avgRating ? `${avgRating} / 5` : '' } : f))
        .filter(f => f.value)
        .slice(0, 3);
    const galleryStrip = GALLERY.slice(0, 5);

    return (
        <div className="min-h-screen bg-ivory font-body text-ink dark:bg-night dark:text-cream">
            <Navbar />

            {/* HERO: headline is visible immediately (no entrance animation), photo drifts slowly */}
            <section aria-label="Welcome" className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden bg-ink">
                <img
                    src={IMAGES.hero}
                    alt="Hotel pool and terrace at dusk"
                    fetchPriority="high"
                    className="absolute inset-0 h-full w-full object-cover animate-[heroDrift_24s_ease-in-out_infinite_alternate]"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/20 to-black/75" aria-hidden="true" />
                <div id="main" className="relative mx-auto w-full max-w-[1400px] px-4 pb-8 pt-40 sm:px-6 md:pb-12">
                    <p className="mb-5 text-[0.75rem] font-semibold uppercase tracking-[0.3em] text-gold">Galle Face · Colombo</p>
                    <h1 className="max-w-4xl font-display text-[2.6rem] font-medium leading-[1.05] text-white sm:text-6xl lg:text-7xl">
                        Wake up to the Indian Ocean, a short walk from old Colombo.
                    </h1>
                    <p className="mt-6 max-w-xl text-base leading-7 text-white/85 md:text-lg">
                        Sea-facing rooms, Ayurvedic spa rituals and Sri Lankan cooking, with our best rate when you book here.
                    </p>
                    <div className="mt-10 md:mt-14">
                        <BookingBar hotels={hotels.data} />
                    </div>
                </div>
            </section>

            {/* INTRO + FACTS */}
            <section className="py-20 md:py-28" aria-labelledby="intro-title">
                <div className="mx-auto grid max-w-[1400px] gap-12 px-4 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
                    <Reveal>
                        <p className="mb-4 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-bronze dark:text-gold">Welcome to {SITE.name}</p>
                        <h2 id="intro-title" className="font-display text-3xl leading-[1.2] text-ink sm:text-4xl md:text-[2.9rem] dark:text-cream">
                            A calm place by the sea, in the middle of a city that never stops.
                        </h2>
                    </Reveal>
                    <Reveal delay={0.1} className="flex flex-col justify-end">
                        <p className="text-[1.05rem] leading-8 text-taupe dark:text-gray-300">
                            We are a small hotel with a big welcome. Teak floors and handloom linens in the rooms, hoppers and
                            fresh tea in the morning, and a team who will happily plan your day, from temple visits in Pettah to sunset on Galle Face Green.
                        </p>
                        <Link to="/about" className={`${textLink} mt-6`}>Our story {ARROW}</Link>
                    </Reveal>
                </div>
                <div className="mx-auto mt-16 grid max-w-[1400px] grid-cols-1 gap-px overflow-hidden px-4 sm:grid-cols-3 sm:px-6">
                    {facts.map((f, i) => (
                        <Reveal key={f.label} delay={i * 0.08} className="border-t border-wheat pt-6 sm:pr-8 dark:border-graphite">
                            <p className="font-display text-5xl text-ink dark:text-cream">{f.value}</p>
                            <p className="mt-2 text-sm uppercase tracking-[0.14em] text-taupe dark:text-gray-400">{f.label}</p>
                        </Reveal>
                    ))}
                </div>
            </section>

            {/* ROOMS */}
            <section className="bg-cream py-20 md:py-28 dark:bg-charcoal" aria-labelledby="rooms-title">
                <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
                    <SectionHeading
                        id="rooms-title"
                        eyebrow="Rooms & Suites"
                        title="Rooms made for slow mornings"
                        text="Every room has air conditioning, fast Wi-Fi, a rain shower and a proper desk. Most face the ocean."
                        action={<Link to="/rooms" className={textLink}>View all rooms {ARROW}</Link>}
                    />
                    {rooms.loading ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {[0, 1, 2].map(i => <Skeleton key={i} className="h-[440px] rounded-2xl" />)}
                        </div>
                    ) : featured.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-wheat p-10 text-center text-sm text-taupe dark:border-graphite dark:text-gray-400">
                            Rooms will appear here once they are added. Call us on {SITE.phone} to book.
                        </p>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {featured.map((t, i) => (
                                <Reveal key={t._id} delay={i * 0.08}>
                                    <RoomTypeCard type={t} currency={currency} showHotel={hotels.data.length > 1} />
                                </Reveal>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* PILLARS */}
            <section className="py-20 md:py-28" aria-label="Dining, spa and rooms">
                <div className="mx-auto max-w-[1400px] space-y-20 px-4 sm:px-6 md:space-y-28">
                    {PILLARS.map((p, i) => (
                        <div key={p.key} className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-20 ${i % 2 ? 'lg:[&>*:first-child]:order-2' : ''}`}>
                            <Reveal className="overflow-hidden rounded-2xl">
                                <img src={p.image} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover transition-transform duration-[1.5s] hover:scale-105" />
                            </Reveal>
                            <Reveal delay={0.1}>
                                <p className="mb-4 flex items-center gap-4 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-bronze dark:text-gold">
                                    <span className="tabular-nums text-taupe/70 dark:text-gray-500">0{i + 1}</span>{p.eyebrow}
                                </p>
                                <h2 className="font-display text-3xl leading-tight text-ink sm:text-4xl md:text-5xl dark:text-cream">{p.title}</h2>
                                <p className="mt-5 max-w-lg text-[1.02rem] leading-8 text-taupe dark:text-gray-300">{p.text}</p>
                                <Link to={p.to} className={`${textLink} mt-8`}>{p.cta} {ARROW}</Link>
                            </Reveal>
                        </div>
                    ))}
                </div>
            </section>

            {/* OFFERS */}
            <section className="bg-cream py-20 md:py-28 dark:bg-charcoal" aria-labelledby="offers-title">
                <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
                    <SectionHeading id="offers-title" eyebrow="Offers" title="More reasons to stay"
                        action={<Link to="/offers" className={textLink}>All offers {ARROW}</Link>} />
                    <div className="grid gap-6 md:grid-cols-3">
                        {OFFERS.map((o, i) => (
                            <Reveal key={o.slug} delay={i * 0.08}>
                                <Link to={`/offers#${o.slug}`} className="group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-ink">
                                    <img src={o.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-90 transition-transform duration-[1.5s] group-hover:scale-105" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" aria-hidden="true" />
                                    <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                                        <span className="mb-3 inline-block rounded-full bg-gold px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-ink">{o.tag}</span>
                                        <h3 className="font-display text-2xl leading-tight sm:text-3xl">{o.title}</h3>
                                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/80">{o.text}</p>
                                        <span className="mt-4 inline-flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-gold">View offer {ARROW}</span>
                                    </div>
                                </Link>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* A DAY AT THE HOTEL */}
            <section className="relative overflow-hidden bg-ink py-20 text-cream md:py-28" aria-labelledby="day-title">
                <img src={IMAGES.facade} alt="" aria-hidden="true" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-15" />
                <div className="relative mx-auto max-w-[1400px] px-4 sm:px-6">
                    <SectionHeading id="day-title" tone="dark" eyebrow="A day in Colombo" title="From sunrise yoga to a rooftop nightcap"
                        text="Our concierge can arrange any of these for you. Just ask at the desk or send us a message before you arrive." />
                    <ol className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                        {DAY_TIMELINE.map((d, i) => (
                            <Reveal as="li" key={d.time} delay={(i % 3) * 0.08} className="border-t border-white/15 pt-6">
                                <p className="font-display text-4xl tabular-nums text-gold">{d.time}</p>
                                <h3 className="mt-3 text-lg font-semibold text-white">{d.title}</h3>
                                <p className="mt-2 text-sm leading-6 text-cream/70">{d.text}</p>
                            </Reveal>
                        ))}
                    </ol>
                </div>
            </section>

            {/* REVIEWS: only real, published guest reviews */}
            {reviews.data.length > 0 && (
                <section className="py-20 md:py-28" aria-labelledby="reviews-title">
                    <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
                        <SectionHeading id="reviews-title" eyebrow="Guest reviews" title="What our guests say" align="center" />
                        <div className="grid gap-6 md:grid-cols-3">
                            {reviews.data.slice(0, 3).map((r, i) => (
                                <Reveal key={r.id} delay={i * 0.08} as="article" className="flex flex-col rounded-2xl border border-sand bg-white p-8 dark:border-graphite dark:bg-charcoal">
                                    <Stars value={r.rating} />
                                    <blockquote className="mt-5 flex-1 font-display text-lg leading-8 text-ink dark:text-cream">“{r.comment}”</blockquote>
                                    <p className="mt-6 text-sm font-semibold text-ink dark:text-cream">{r.name}</p>
                                    {(r.roomType || r.hotel) && <p className="text-xs text-taupe dark:text-gray-400">{[r.roomType, r.hotel].filter(Boolean).join(' · ')}</p>}
                                </Reveal>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* LOCATION */}
            <section className={`${reviews.data.length > 0 ? 'bg-cream dark:bg-charcoal' : ''} py-20 md:py-28`} aria-labelledby="location-title">
                <div className="mx-auto grid max-w-[1400px] gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
                    <Reveal>
                        <p className="mb-4 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-bronze dark:text-gold">Getting here</p>
                        <h2 id="location-title" className="font-display text-3xl leading-tight text-ink sm:text-4xl dark:text-cream">On the seafront, in the centre of the city</h2>
                        <address className="mt-5 not-italic text-taupe dark:text-gray-300">{SITE.address}</address>
                        <dl className="mt-8 space-y-5 text-sm">
                            {[
                                ['From the airport', 'About 45 minutes by car from Bandaranaike International Airport (CMB). We can send a driver.'],
                                ['Fort railway station', '10 minutes by tuk-tuk.'],
                                ['Galle Face Green', 'A two-minute walk.'],
                            ].map(([k, v]) => (
                                <div key={k} className="border-t border-wheat pt-4 dark:border-graphite">
                                    <dt className="font-semibold text-ink dark:text-cream">{k}</dt>
                                    <dd className="mt-1 leading-6 text-taupe dark:text-gray-400">{v}</dd>
                                </div>
                            ))}
                        </dl>
                        <div className="mt-8 flex flex-wrap gap-6">
                            <a href={directionsUrl(SITE.address)} target="_blank" rel="noreferrer" className={textLink}>Get directions {ARROW}</a>
                            <Link to="/contact" className={textLink}>Contact us {ARROW}</Link>
                        </div>
                    </Reveal>
                    <Reveal delay={0.1} className="overflow-hidden rounded-2xl border border-sand dark:border-graphite">
                        <iframe title={`Map showing ${SITE.name}`} src={mapEmbedUrl(SITE.address)} loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                            className="h-[360px] w-full border-0 md:h-full md:min-h-[440px] dark:[filter:invert(0.9)_hue-rotate(180deg)]" />
                    </Reveal>
                </div>
            </section>

            {/* GALLERY STRIP */}
            <section className="pb-20 pt-4 md:pb-28" aria-labelledby="gallery-title">
                <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
                    <SectionHeading id="gallery-title" eyebrow="Gallery" title="A look around"
                        action={<Link to="/gallery" className={textLink}>See all photos {ARROW}</Link>} />
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:grid-rows-2">
                        {galleryStrip.map((g, i) => (
                            <button
                                key={g.src}
                                type="button"
                                onClick={() => setPhoto(i)}
                                aria-label={`Open photo: ${g.alt}`}
                                className={`group relative overflow-hidden rounded-xl bg-stone dark:bg-graphite cursor-zoom-in ${i === 0 ? 'col-span-2 row-span-2 aspect-square md:aspect-auto' : 'aspect-square'}`}
                            >
                                <img src={g.src} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                            </button>
                        ))}
                    </div>
                </div>
                <Lightbox images={galleryStrip} index={photo} onChange={setPhoto} />
            </section>

            <Footer />
        </div>
    );
};

export default Home;
