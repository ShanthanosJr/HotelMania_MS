import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import PageHero from '../../components/PageHero';
import Reveal from '../../components/site/Reveal';
import { DINING, IMAGES } from '../../config/content';
import { SITE, telHref } from '../../config/site';

const Dining: React.FC = () => (
    <div className="min-h-screen bg-ivory font-body text-ink dark:bg-night dark:text-cream">
        <Navbar />
        <PageHero eyebrow="Dining" title="Three ways to taste Sri Lanka"
            subtitle="From hoppers at sunrise to the catch of the day at dusk, our kitchens cook with local produce and island spices. Hotel guests and visitors are welcome."
            image={IMAGES.restaurant} />
        <main id="main" className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 md:py-24">
            <div className="space-y-16 md:space-y-24">
                {DINING.map((v, i) => (
                    <article key={v.name} className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-16 ${i % 2 ? 'lg:[&>*:first-child]:order-2' : ''}`}>
                        <Reveal className="overflow-hidden rounded-2xl">
                            <img src={v.image} alt="" loading={i ? 'lazy' : undefined} className="aspect-[4/3] w-full object-cover" />
                        </Reveal>
                        <Reveal delay={0.1}>
                            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-bronze dark:text-gold">{v.kind}</p>
                            <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl md:text-5xl dark:text-cream">{v.name}</h2>
                            <p className="mt-2 text-sm font-semibold text-taupe dark:text-gray-400">Open daily · {v.hours}</p>
                            <p className="mt-5 max-w-lg text-[1.02rem] leading-8 text-taupe dark:text-gray-300">{v.text}</p>
                            <ul className="mt-6 space-y-2 text-sm text-ink dark:text-cream">
                                {v.highlights.map(h => <li key={h} className="flex items-center gap-3"><span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden="true" />{h}</li>)}
                            </ul>
                        </Reveal>
                    </article>
                ))}
            </div>
            <Reveal className="mt-24 rounded-2xl bg-ink px-6 py-12 text-center text-cream sm:px-12">
                <h2 className="font-display text-3xl text-white">Reserve a table</h2>
                <p className="mx-auto mt-3 max-w-xl text-cream/75">Call the restaurant team or send us a message with your date, time and number of guests. Tell us about any allergies.</p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                    <a href={telHref(SITE.phone)} className="rounded-lg bg-gold px-6 py-3 text-[0.72rem] font-bold uppercase tracking-[0.18em] text-ink hover:bg-[#E0BE4F]">Call {SITE.phone}</a>
                    <Link to="/contact?topic=dining" className="rounded-lg border border-white/30 px-6 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-white hover:border-gold hover:text-gold">Send a request</Link>
                </div>
            </Reveal>
        </main>
        <Footer />
    </div>
);

export default Dining;
